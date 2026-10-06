<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Support\BodyValidation;
use PHPUnit\Framework\TestCase;
use Psr\Http\Message\ServerRequestInterface;

final class BodyValidationTest extends TestCase
{
    public function testParsedBodyReturnsEmptyArrayForNull(): void
    {
        $request = $this->createMock(ServerRequestInterface::class);
        $request->method('getParsedBody')->willReturn(null);

        $this->assertSame([], BodyValidation::parsedBody($request));
    }

    public function testParsedBodyReturnsEmptyArrayForScalar(): void
    {
        $request = $this->createMock(ServerRequestInterface::class);
        $request->method('getParsedBody')->willReturn('not an array');

        $this->assertSame([], BodyValidation::parsedBody($request));
    }

    public function testParsedBodyReturnsArrayForArray(): void
    {
        $request = $this->createMock(ServerRequestInterface::class);
        $request->method('getParsedBody')->willReturn(['email' => 'test@example.com']);

        $this->assertSame(['email' => 'test@example.com'], BodyValidation::parsedBody($request));
    }

    public function testRequireStringsReturnsMissingError(): void
    {
        $data = ['email' => 'test@example.com'];

        $error = BodyValidation::requireStrings($data, ['email', 'password']);

        $this->assertSame('Missing required fields: password', $error);
    }

    public function testRequireStringsReturnsInvalidTypeError(): void
    {
        $data = ['email' => ['not' => 'a string'], 'password' => 'secret'];

        $error = BodyValidation::requireStrings($data, ['email', 'password']);

        $this->assertSame('Fields must be strings: email', $error);
    }

    public function testRequireStringsReturnsNullWhenValid(): void
    {
        $data = ['email' => 'test@example.com', 'password' => 'secret'];

        $this->assertNull(BodyValidation::requireStrings($data, ['email', 'password']));
    }

    public function testRequireStringsTreatsEmptyStringAsMissing(): void
    {
        $data = ['email' => '', 'password' => 'secret'];

        $error = BodyValidation::requireStrings($data, ['email', 'password']);

        $this->assertSame('Missing required fields: email', $error);
    }

    public function testValidateOptionalStringsReturnsInvalidTypeError(): void
    {
        $data = ['name' => ['not' => 'a string']];

        $error = BodyValidation::validateOptionalStrings($data, ['name']);

        $this->assertSame('Fields must be strings: name', $error);
    }

    public function testValidateOptionalStringsReturnsNullWhenValid(): void
    {
        $data = ['name' => 'John'];

        $this->assertNull(BodyValidation::validateOptionalStrings($data, ['name']));
    }

    public function testValidateOptionalStringsReturnsNullWhenAbsent(): void
    {
        $data = [];

        $this->assertNull(BodyValidation::validateOptionalStrings($data, ['name']));
    }

    public function testValidateOptionalStringsReturnsNullWhenEmptyString(): void
    {
        $data = ['name' => ''];

        $this->assertNull(BodyValidation::validateOptionalStrings($data, ['name']));
    }

    public function testStringReturnsValueWhenNonEmptyString(): void
    {
        $data = ['name' => 'John'];

        $this->assertSame('John', BodyValidation::string($data, 'name'));
    }

    public function testStringReturnsNullWhenEmptyString(): void
    {
        $data = ['name' => ''];

        $this->assertNull(BodyValidation::string($data, 'name'));
    }

    public function testStringReturnsNullWhenMissing(): void
    {
        $data = [];

        $this->assertNull(BodyValidation::string($data, 'name'));
    }

    public function testStringReturnsNullWhenArray(): void
    {
        $data = ['name' => ['not' => 'a string']];

        $this->assertNull(BodyValidation::string($data, 'name'));
    }

    public function testIntReturnsValueWhenInteger(): void
    {
        $data = ['id' => 42];

        $this->assertSame(42, BodyValidation::int($data, 'id'));
    }

    public function testIntReturnsValueWhenNumericString(): void
    {
        $data = ['id' => '42'];

        $this->assertSame(42, BodyValidation::int($data, 'id'));
    }

    public function testIntReturnsNullWhenEmptyString(): void
    {
        $data = ['id' => ''];

        $this->assertNull(BodyValidation::int($data, 'id'));
    }

    public function testIntReturnsNullWhenMissing(): void
    {
        $data = [];

        $this->assertNull(BodyValidation::int($data, 'id'));
    }

    public function testIntReturnsNullWhenArray(): void
    {
        $data = ['id' => ['not' => 'an int']];

        $this->assertNull(BodyValidation::int($data, 'id'));
    }

    public function testIntReturnsNullWhenFloat(): void
    {
        $data = ['id' => 42.5];

        $this->assertNull(BodyValidation::int($data, 'id'));
    }

    public function testValidateOptionalIntsReturnsInvalidTypeError(): void
    {
        $data = ['id' => ['not' => 'an int']];

        $error = BodyValidation::validateOptionalInts($data, ['id']);

        $this->assertSame('Fields must be integers: id', $error);
    }

    public function testValidateOptionalIntsReturnsNullWhenValidInt(): void
    {
        $data = ['id' => 42];

        $this->assertNull(BodyValidation::validateOptionalInts($data, ['id']));
    }

    public function testValidateOptionalIntsReturnsNullWhenValidNumericString(): void
    {
        $data = ['id' => '42'];

        $this->assertNull(BodyValidation::validateOptionalInts($data, ['id']));
    }

    public function testValidateOptionalIntsReturnsNullWhenAbsent(): void
    {
        $data = [];

        $this->assertNull(BodyValidation::validateOptionalInts($data, ['id']));
    }

    public function testValidateOptionalIntsReturnsNullWhenEmptyString(): void
    {
        $data = ['id' => ''];

        $this->assertNull(BodyValidation::validateOptionalInts($data, ['id']));
    }
}