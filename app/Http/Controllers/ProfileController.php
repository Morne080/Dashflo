<?php

namespace App\Http\Controllers;

use App\Http\Requests\AccountVerificationSettingsRequest;
use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $user instanceof MustVerifyEmail,
            'status' => session('status'),
            'account_verifications' => $user->accountVerificationSettingsForClient(),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    public function updateVerificationSettings(AccountVerificationSettingsRequest $request): RedirectResponse
    {
        $user = $request->user();
        $existing = $user->accountVerificationSettings();
        $vIn = $request->validated('verifications');
        if (! is_array($vIn)) {
            $vIn = [];
        }

        $twilio = $existing['twilio_lookup'];
        if (isset($vIn['twilio_lookup']) && is_array($vIn['twilio_lookup'])) {
            $tIn = $vIn['twilio_lookup'];
            if (array_key_exists('enabled', $tIn)) {
                $twilio['enabled'] = (bool) $tIn['enabled'];
            }
            if (array_key_exists('account_sid', $tIn)) {
                $twilio['account_sid'] = (string) $tIn['account_sid'];
            }
            if (isset($tIn['auth_token']) && is_string($tIn['auth_token']) && $tIn['auth_token'] !== '') {
                $twilio['auth_token'] = $tIn['auth_token'];
            }
        }

        $email = $existing['email_verification'];
        if (isset($vIn['email_verification']) && is_array($vIn['email_verification'])) {
            $eIn = $vIn['email_verification'];
            if (array_key_exists('enabled', $eIn)) {
                $email['enabled'] = (bool) $eIn['enabled'];
            }
        }

        $tf = $existing['trustedform'];
        if (isset($vIn['trustedform']) && is_array($vIn['trustedform'])) {
            $tfIn = $vIn['trustedform'];
            if (array_key_exists('enabled', $tfIn)) {
                $tf['enabled'] = (bool) $tfIn['enabled'];
            }
            if (isset($tfIn['api_key']) && is_string($tfIn['api_key']) && $tfIn['api_key'] !== '') {
                $tf['api_key'] = $tfIn['api_key'];
            }
        }

        $user->verification_settings = [
            'twilio_lookup' => $twilio,
            'email_verification' => $email,
            'trustedform' => $tf,
        ];
        $user->save();

        return Redirect::route('profile.edit')->with('status', 'verification-settings-saved');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
