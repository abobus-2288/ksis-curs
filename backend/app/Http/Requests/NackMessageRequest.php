<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class NackMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ack_token' => ['required', 'string'],
            'error' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'requeue' => ['sometimes', 'boolean'],
        ];
    }
}
