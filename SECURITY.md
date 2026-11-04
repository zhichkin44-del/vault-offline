# Security and threat model

Vault is a **single-user, local, offline** password manager. That scope is
deliberate: no server, no account, no sync and no sharing means there is no
remote party to breach and nothing to trust except your own machine and your
master password.

## How your data is protected

| Step | What happens |
| --- | --- |
| Key derivation | Your master password goes through **Argon2id** (memory 64 MiB, 3 passes, parallelism 1, 32-byte output) with a random 16-byte salt. |
| Encryption | The whole entry list (titles, logins, passwords, URLs, notes, custom fields) is serialised to JSON and encrypted with **AES-256-GCM** using a fresh random 96-bit IV on every save. GCM is authenticated: any modified byte makes decryption fail instead of returning garbage. |
| What stays readable | Only the file header: format version, KDF name and parameters, salt and IV. None of these are secret. |
| Crypto libraries | AES-GCM and PBKDF2 come from the platform WebCrypto API; Argon2id from [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) (dependency-free, widely used; its independent audit predates the Argon2 module, so Argon2id itself has not been audited separately). No custom cryptography. |
| Randomness | Salts, IVs and generated passwords use `crypto.getRandomValues` (OS CSPRNG). |
| Legacy files | Vaults created by early builds used PBKDF2-SHA-256 (250 000 / 600 000 iterations). They still open; saving them again keeps their parameters until you change the master password. |

There is **no password recovery**. Nobody, including the author, can decrypt a
vault without its master password.

### Where the data lives

- **Vault:** `vault.vault` in the app data folder of your user profile
  (`%APPDATA%\com.vaulty.app\` on Windows,
  `~/Library/Application Support/com.vaulty.app/` on macOS). Only ciphertext is
  written to disk.
- **Crash-safe saves:** every save goes to a temp file, is flushed to disk, and
  only then replaces the vault. The previous version is kept as
  `vault.vault.bak`; if the main file is ever unreadable, Vault opens the backup.
- **Migration:** v0.1 kept the encrypted blob in the WebView's localStorage. On
  first start, v0.2 copies it into `vault.vault`, reads it back to verify, and
  only then removes the old copy. If anything fails, the old copy is kept and used.
- **Backups (Export):** a `.vault` file in the same encrypted format, saved
  wherever you choose. Exports are never plaintext.
- **Settings** (theme, accent, language, auto-lock timeout) are stored
  unencrypted, because they are not secret.

### While unlocked

- The master password is used once to derive the key and is **not kept** in
  application state. Only the derived, non-extractable WebCrypto `CryptoKey`
  stays in memory, and it is dropped on lock.
- Decrypted entries stay in memory until you lock or close the app.
  JavaScript cannot reliably wipe memory, so locking (references dropped) and
  closing the app are what clear it.
- **Auto-lock** after inactivity (default 5 minutes, configurable), plus
  `Ctrl+L` to lock at once. Locking closes all open dialogs.
- Copied secrets are **cleared from the clipboard after 15 seconds**.

### Hardening

- **No network, enforced:** a strict Content Security Policy (`default-src 'self'`,
  `connect-src` limited to Tauri's local IPC) blocks any request to the internet
  from the app window, even if a bug or a malicious entry tried to make one.
  The app contains no networking code, and fonts are bundled.
- **Narrow native surface:** the window can call only three vault commands
  (exists / read / write, all on fixed file names in the app data folder), plus
  the native open/save dialogs and reading/writing the file you pick there.
- **Untrusted files are bounded:** KDF parameters in an imported file are checked
  before any key derivation (Argon2id: 8 MiB–1 GiB memory, 1–16 passes,
  parallelism 1–8; PBKDF2: 100 000–10 000 000 iterations). A crafted file
  can't make the app allocate gigabytes or spin for hours.
- **Import never silently overwrites:** the backup's password is typed into a
  masked field. The default is to *merge* (newer copy of an entry wins; nothing
  is deleted, your master password stays the same). *Replace* needs a second
  confirmation that says how many entries will be lost and that the backup's
  password becomes the master password.
- **Entry content is never parsed as HTML:** all user data is rendered with
  `textContent`; `innerHTML` is used only for the app's own static SVG icons.

## What Vault protects against

- **Someone gets your disk or a backup file** (stolen laptop, cloud-synced
  backup folder, lost USB stick): they see ciphertext only, and Argon2id makes
  each password guess expensive.
- **Tampering with the vault file:** detected by AES-GCM authentication.
- **Server breaches, account takeover, vendor shutdown:** there is no server
  and no account.
- **Someone at your unlocked computer later on:** auto-lock and clipboard
  clearing narrow that window.

## What Vault deliberately does NOT do

- **No network at all:** no cloud sync, no telemetry, no update checks, no
  favicon fetching. Move data between machines with an encrypted export.
- **No sharing or team vaults.** One vault, one person, one master password.
- **No browser extension or autofill.** You copy and paste; nothing injects
  into web pages.
- **No password recovery or "forgot password" flow.**
- **No cloud backup.** Backing up your `.vault` exports is up to you.

## What Vault cannot protect against

- **Malware on your computer** while the vault is unlocked: a keylogger, screen
  recorder or a process that reads memory sees what you see.
- **A weak master password.** Argon2id slows guessing down; it cannot save
  `password123`. Use a long passphrase (four or more random words).
- **Someone who watches you type the master password**, or who uses your
  computer while the vault is open.
- **Unsigned installers.** Releases are not code-signed (signing certificates
  cost money). Download only from this repository's Releases page, or build
  from source.

## Reporting a vulnerability

Please open a [GitHub security advisory](https://github.com/zhichkin44-del/vault-offline/security/advisories/new)
(private) rather than a public issue. Include steps to reproduce and the
version you tested.
