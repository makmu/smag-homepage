<?php

declare(strict_types=1);

namespace App\Tests\Services;

use App\Services\CsvExportService;
use PHPUnit\Framework\TestCase;

final class CsvExportServiceTest extends TestCase
{
    private const FORMULA_PREFIXES = ['=', '+', '-', '@'];

    public function testFormulaCommentIsExportedInert(): void
    {
        $rows = $this->export([
            [
                'name' => 'Max Mustermann',
                'email' => 'max@example.com',
                'comment' => "=cmd|'/C calc'!A0",
                'created_at' => '2026-10-05 12:00:00',
            ],
        ]);

        $this->assertSame("'=cmd|'/C calc'!A0", $rows[1][2]);
    }

    public function testEveryFormulaPrefixIsNeutralized(): void
    {
        foreach (self::FORMULA_PREFIXES as $prefix) {
            $rows = $this->export([
                [
                    'name' => $prefix . 'SUM(A1)',
                    'email' => 'max@example.com',
                    'comment' => $prefix . '1+1',
                    'created_at' => '2026-10-05 12:00:00',
                ],
            ]);

            $this->assertSame("'" . $prefix . 'SUM(A1)', $rows[1][0]);
            $this->assertSame("'" . $prefix . '1+1', $rows[1][2]);
        }
    }

    public function testWhitespacePaddedFormulaIsNeutralized(): void
    {
        $rows = $this->export([
            [
                'name' => 'Max',
                'email' => 'max@example.com',
                'comment' => "\t =1+1",
                'created_at' => '2026-10-05 12:00:00',
            ],
        ]);

        $this->assertSame("'\t =1+1", $rows[1][2]);
    }

    public function testRegularValuesAreExportedUnchanged(): void
    {
        $rows = $this->export([
            [
                'name' => 'Max Mustermann',
                'email' => 'max@example.com',
                'comment' => 'Bis dann!',
                'created_at' => '2026-10-05 12:00:00',
            ],
        ]);

        $this->assertSame(['Name', 'E-Mail', 'Kommentar', 'Anmeldezeitpunkt'], $rows[0]);
        $this->assertSame(['Max Mustermann', 'max@example.com', 'Bis dann!', '2026-10-05 12:00:00'], $rows[1]);
    }

    public function testNoExportedCellStartsWithAFormulaPrefix(): void
    {
        $rows = $this->export([
            [
                'name' => '=2+2',
                'email' => '@max@example.com',
                'comment' => '-1',
                'created_at' => '2026-10-05 12:00:00',
            ],
        ]);

        foreach ($rows as $row) {
            foreach ($row as $cell) {
                $cell = (string) $cell;

                foreach (self::FORMULA_PREFIXES as $prefix) {
                    $this->assertFalse(str_starts_with($cell, $prefix), "Exported cell starts with \"{$prefix}\": {$cell}");
                }
            }
        }
    }

    /**
     * @return array<int, array<int, string|null>>
     */
    private function export(array $signups): array
    {
        $csv = (new CsvExportService())->buildSignupExport($signups);

        $this->assertStringStartsWith("\xEF\xBB\xBF", $csv);

        $rows = [];
        foreach (explode("\n", rtrim(substr($csv, 3), "\n")) as $line) {
            $rows[] = str_getcsv($line, ';', '"', '\\');
        }

        return $rows;
    }
}
