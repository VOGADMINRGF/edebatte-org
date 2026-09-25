# Multi-brand marketing runtime

This module contains the fail-closed public-brand routing contract for the shared marketing control plane. It keeps eDebatte, VoiceOpenGov and Vote4Gov as distinct public senders while allowing one operator surface and one review/distribution infrastructure.

A VoiceOpenGov or Vote4Gov campaign must never silently fall back to an eDebatte brand profile. Missing or mismatched brand data is a blocker.
