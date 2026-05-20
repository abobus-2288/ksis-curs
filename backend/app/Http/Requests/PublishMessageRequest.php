<?php

namespace App\Http\Requests;

use App\Services\Broker\RedisBroker;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublishMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'payload' => ['required', 'array'],
            'priority' => ['sometimes', Rule::in(RedisBroker::PRIORITIES)],
            'delay_seconds' => ['sometimes', 'integer', 'min:0', 'max:604800'],
            'max_attempts' => ['sometimes', 'integer', 'min:1', 'max:25'],
        ];
    }
}
