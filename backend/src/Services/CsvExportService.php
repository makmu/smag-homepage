<?php

declare(strict_types=1);

namespace App\Services;

final class CsvExportService
{
    private const HEADERS = ['Name', 'E-Mail', 'Kommentar', 'Anmeldezeitpunkt'];
    private const DELIMITER = ';';
    private const FORMULA_PREFIXES = ['=', '+', '-', '@'];

    public function buildSignupExport(array $signups): string
    {
        $output = fopen('php://temp', 'r+');

        fputcsv($output, self::HEADERS, self::DELIMITER, escape: '');

        foreach ($signups as $signup) {
            fputcsv($output, [
                $this->neutralize((string) ($signup['name'] ?? '')),
                $this->neutralize((string) ($signup['email'] ?? '')),
                $this->neutralize((string) ($signup['comment'] ?? '')),
                $this->neutralize((string) ($signup['created_at'] ?? '')),
            ], self::DELIMITER, escape: '');
        }

        rewind($output);
        $content = stream_get_contents($output);
        fclose($output);

        return "\xEF\xBB\xBF" . $content;
    }

    /**
     * Spreadsheet applications execute cells starting with a formula prefix
     * (CSV injection). Leading whitespace is ignored by some of them before
     * the formula check, so it is skipped. The value itself stays intact and
     * only gets a prepended quote, which can never start a formula.
     */
    private function neutralize(string $value): string
    {
        $trimmed = ltrim($value);

        if ($trimmed !== '' && in_array($trimmed[0], self::FORMULA_PREFIXES, true)) {
            return "'" . $value;
        }

        return $value;
    }
}
