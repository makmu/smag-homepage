<?php

declare(strict_types=1);

use App\Controllers\EventController;
use App\Controllers\AuthController;
use App\Services\TokenService;
use App\Services\UserService;
use App\Middleware\TokenAuthenticationMiddleware;
use Slim\App;

return function (App $app): void {
    $tokenService = new TokenService();
    $userService = new UserService();
    $authController = new AuthController($tokenService, $userService);

    $app->post('/api/v1/auth/login', [$authController, 'login']);
    $app->post('/api/v1/auth/refresh', [$authController, 'refresh']);
    $app->post('/api/v1/auth/logout', [$authController, 'logout']);
    $app->post('/api/v1/auth/logout-all', [$authController, 'logoutAll'])->add(new TokenAuthenticationMiddleware($tokenService));

    $eventController = new EventController();

    $app->get('/api/v1/events', [$eventController, 'getEvents']);
    $app->get('/api/v1/events/{id}', [$eventController, 'getEvent']);
    $app->post('/api/v1/events', [$eventController, 'createEvent'])->add(new TokenAuthenticationMiddleware($tokenService));
    $app->put('/api/v1/events/{id}', [$eventController, 'updateEvent'])->add(new TokenAuthenticationMiddleware($tokenService));
    $app->post('/api/v1/events/{id}/signups', [$eventController, 'signup']);
    $app->get('/api/v1/events/{eventId}/signups/{signupId}', [$eventController, 'getSignupDetail'])->add(new TokenAuthenticationMiddleware($tokenService));
    $app->delete('/api/v1/events/{eventId}/signups/{signupId}', [$eventController, 'deleteSignup'])->add(new TokenAuthenticationMiddleware($tokenService));
    $app->get('/api/v1/events/{id}/signups/csv', [$eventController, 'downloadSignupsCsv'])->add(new TokenAuthenticationMiddleware($tokenService));
};
