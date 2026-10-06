<?php

declare(strict_types=1);

namespace App\Support;

use Psr\Http\Message\ServerRequestInterface;

/**
 * Validates parsed request body values before they are passed to typed code.
 *
 * Clients control the type of every JSON body value, so a field that a
 * controller expects to be a string may arrive as an array, object or number.
 * Under strict_types such a value throws a TypeError when it reaches a typed
 * service method or a string function, which surfaces as an HTTP 500 instead
 * of a 400.
 */
final class BodyValidation
{
    /**
     * Returns the parsed body as an array; non-array bodies (empty or scalar
     * payloads) are treated as an empty body.
     */
    public static function parsedBody(ServerRequestInterface $request): array
    {
        $body = $request->getParsedBody();

        return is_array($body) ? $body : [];
    }

    /**
     * Checks that every field is present and a non-empty string.
     *
     * @param string[] $fields
     *
     * @return string|null The error message for a 400 response, or null when
     *                     every field is valid.
     */
    public static function requireStrings(array $data, array $fields): ?string
    {
        $missing = [];
        $invalid = [];

        foreach ($fields as $field) {
            $value = $data[$field] ?? null;

            if ($value === null || $value === '') {
                $missing[] = $field;
            } elseif (!is_string($value)) {
                $invalid[] = $field;
            }
        }

        if ($missing !== []) {
            return 'Missing required fields: ' . implode(', ', $missing);
        }

        if ($invalid !== []) {
            return 'Fields must be strings: ' . implode(', ', $invalid);
        }

        return null;
    }

    /**
     * Checks that every field that is present is a non-empty string. Absent or
     * empty fields are valid and resolve to null via string().
     *
     * @param string[] $fields
     *
     * @return string|null The error message for a 400 response, or null when
     *                     every present field is valid.
     */
    public static function validateOptionalStrings(array $data, array $fields): ?string
    {
        $invalid = [];

        foreach ($fields as $field) {
            $value = $data[$field] ?? null;

            if ($value !== null && $value !== '' && !is_string($value)) {
                $invalid[] = $field;
            }
        }

        if ($invalid === []) {
            return null;
        }

        return 'Fields must be strings: ' . implode(', ', $invalid);
    }

    /**
     * Returns the field value when it is a non-empty string, null otherwise.
     */
    public static function string(array $data, string $field): ?string
    {
        $value = $data[$field] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }

    /**
     * Returns the field value when it is an integer, null otherwise.
     * Accepts int or numeric string (e.g. "42").
     */
    public static function int(array $data, string $field): ?int
    {
        $value = $data[$field] ?? null;

        if (is_int($value)) {
            return $value;
        }

        if (is_string($value) && ctype_digit($value)) {
            return (int) $value;
        }

        return null;
    }

    /**
     * Checks that every field that is present is an integer.
     *
     * @param string[] $fields
     *
     * @return string|null The error message for a 400 response, or null when
     *                     every present field is valid.
     */
    public static function validateOptionalInts(array $data, array $fields): ?string
    {
        $invalid = [];

        foreach ($fields as $field) {
            $value = $data[$field] ?? null;

            if ($value !== null && $value !== '' && !is_int($value) && !(is_string($value) && ctype_digit($value))) {
                $invalid[] = $field;
            }
        }

        if ($invalid === []) {
            return null;
        }

        return 'Fields must be integers: ' . implode(', ', $invalid);
    }
}
