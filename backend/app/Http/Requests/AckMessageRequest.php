<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AckMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ack_token' => ['required', 'string'],
            'result' => ['sometimes', 'nullable', 'array'],
        ];
    }
}
