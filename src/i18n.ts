export type Lang = "ru" | "en";

type Dict = Record<string, string>;

const DICTS: Record<Lang, Dict> = {
  ru: {
    "app.title": "Vault",
    "lock.newVault": "Создать хранилище",
    "lock.openVault": "Открыть хранилище",
    "lock.master": "Мастер-пароль",
    "lock.confirm": "Подтвердите пароль",
    "lock.create": "Создать",
    "lock.unlock": "Разблокировать",
    "lock.firstRun":
      "Придумайте мастер-пароль. Он зашифрует хранилище и не может быть восстановлен.",
    "lock.existing": "Введите мастер-пароль, чтобы разблокировать хранилище.",
    "lock.wrong": "Неверный мастер-пароль",
    "lock.mismatch": "Пароли не совпадают",
    "lock.short": "Пароль слишком короткий (мин. 8 символов)",
    "vault.empty": "Хранилище пусто",
    "vault.emptyHint": "Добавление записей появится в следующей версии.",
    "card.copy": "Копировать",
    "card.copied": "Скопировано!",
    "card.reveal": "Показать",
    "card.hide": "Скрыть",
    "card.login": "Логин",
    "card.password": "Пароль",
    "card.url": "Ссылка",
    "card.note": "Заметка",
    "card.lock": "Заблокировать",
    "editor.title": "Название",
    "editor.new": "Новая запись",
    "editor.edit": "Редактировать",
    "editor.type": "Тип",
    "editor.password": "Пароль",
    "editor.url": "Ссылка",
    "editor.note": "Заметка",
    "editor.fields": "Поля",
    "editor.fieldKey": "Ключ",
    "editor.fieldValue": "Значение",
    "editor.addField": "Добавить поле",
    "editor.save": "Сохранить",
    "editor.cancel": "Отмена",
    "editor.delete": "Удалить",
    "editor.generate": "Сгенерировать",
    "editor.length": "Длина",
    "editor.useLower": "строчные",
    "editor.useUpper": "заглавные",
    "editor.useDigits": "цифры",
    "editor.useSymbols": "символы",
    "editor.confirmDelete": "Удалить запись? Действие необратимо.",
    "sort.updated": "По изменению",
    "sort.title": "По названию",
    "vault.add": "Добавить",
    "card.edit": "Изменить",
    "card.delete": "Удалить",
    "cat.all": "Все",
    "cat.logins": "Пароли",
    "cat.notes": "Заметки",
    "cat.other": "Прочее",
    "type.login": "Пароли",
    "type.note": "Заметка",
    "type.custom": "Прочее",
    "grid.emptyCat": "В этой категории пока нет записей",
    "sec.protected": "Защищено",
    "sec.autolock": "Авто-блок через",
    "export": "Экспорт",
    "export.done": "Экспортировано",
    "export.warn": "Файл содержит зашифрованную копию хранилища. Храните его в безопасном месте.",
    "import": "Импорт",
    "import.master": "Мастер-пароль хранилища",
    "import.invalid": "Повреждённый файл",
    "import.wrong": "Неверный мастер-пароль",
    "import.ok": "Импортировано",
    "lang.toggle": "EN",
    "lang.switch": "Сменить язык",
    "settings.title": "Настройки",
    "settings.appearance": "Внешний вид",
    "settings.theme": "Тема",
    "settings.themeDark": "Тёмная",
    "settings.themeLight": "Светлая",
    "settings.accent": "Акцент",
    "settings.accentTeal": "Бирюзовый",
    "settings.accentPurple": "Фиолетовый",
    "settings.account": "Аккаунт",
    "settings.security": "Безопасность",
    "settings.currentPassword": "Текущий пароль",
    "settings.newPassword": "Новый пароль",
    "settings.confirmPassword": "Подтвердите пароль",
    "settings.changePassword": "Сменить пароль",
    "settings.autoLock": "Авто-блокировка",
    "settings.autoLockOff": "Авто-блокировка выключена",
    "settings.enabled": "Включено",
    "settings.disabled": "Выключено",
    "settings.minutes": "Минут до блокировки",
    "settings.save": "Сохранить",
    "settings.saved": "Сохранено",
    "settings.wrongCurrent": "Неверный текущий пароль",
    "settings.pwChanged": "Пароль изменён",
    "settings.pwMismatch": "Пароли не совпадают",
    "settings.pwShort": "Пароль слишком короткий (мин. 8 символов)",
  },
  en: {
    "app.title": "Vault",
    "lock.newVault": "Create vault",
    "lock.openVault": "Open vault",
    "lock.master": "Master password",
    "lock.confirm": "Confirm password",
    "lock.create": "Create",
    "lock.unlock": "Unlock",
    "lock.firstRun":
      "Choose a master password. It encrypts your vault and cannot be recovered.",
    "lock.existing": "Enter your master password to unlock the vault.",
    "lock.wrong": "Wrong master password",
    "lock.mismatch": "Passwords don't match",
    "lock.short": "Password too short (min 8 characters)",
    "vault.empty": "Vault is empty",
    "vault.emptyHint": "Adding entries arrives in the next version.",
    "card.copy": "Copy",
    "card.copied": "Copied!",
    "card.reveal": "Show",
    "card.hide": "Hide",
    "card.login": "Login",
    "card.password": "Password",
    "card.url": "URL",
    "card.note": "Note",
    "card.lock": "Lock",
    "editor.title": "Title",
    "editor.new": "New entry",
    "editor.edit": "Edit entry",
    "editor.type": "Type",
    "editor.password": "Password",
    "editor.url": "URL",
    "editor.note": "Note",
    "editor.fields": "Fields",
    "editor.fieldKey": "Key",
    "editor.fieldValue": "Value",
    "editor.addField": "Add field",
    "editor.save": "Save",
    "editor.cancel": "Cancel",
    "editor.delete": "Delete",
    "editor.generate": "Generate",
    "editor.length": "Length",
    "editor.useLower": "lowercase",
    "editor.useUpper": "uppercase",
    "editor.useDigits": "digits",
    "editor.useSymbols": "symbols",
    "editor.confirmDelete": "Delete this entry? This cannot be undone.",
    "sort.updated": "By updated",
    "sort.title": "By title",
    "vault.add": "Add",
    "card.edit": "Edit",
    "card.delete": "Delete",
    "export": "Export",
    "export.done": "Exported",
    "export.warn": "The file contains an encrypted copy of your vault. Store it in a safe place.",
    "import": "Import",
    "import.master": "Vault master password",
    "import.invalid": "Corrupted file",
    "import.wrong": "Wrong master password",
    "import.ok": "Imported",
    "lang.toggle": "RU",
    "lang.switch": "Switch language",
    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.theme": "Theme",
    "settings.themeDark": "Dark",
    "settings.themeLight": "Light",
    "settings.accent": "Accent",
    "settings.accentTeal": "Teal",
    "settings.accentPurple": "Purple",
    "settings.account": "Account",
    "settings.security": "Security",
    "settings.currentPassword": "Current password",
    "settings.newPassword": "New password",
    "settings.confirmPassword": "Confirm password",
    "settings.changePassword": "Change password",
    "settings.autoLock": "Auto-lock",
    "settings.autoLockOff": "Auto-lock disabled",
    "settings.enabled": "Enabled",
    "settings.disabled": "Disabled",
    "settings.minutes": "Minutes until lock",
    "settings.save": "Save",
    "settings.saved": "Saved",
    "settings.wrongCurrent": "Wrong current password",
    "settings.pwChanged": "Password changed",
    "settings.pwMismatch": "Passwords don't match",
    "settings.pwShort": "Password too short (min 8 characters)",
    "cat.all": "All",
    "cat.logins": "Passwords",
    "cat.notes": "Notes",
    "cat.other": "Other",
    "type.login": "Passwords",
    "type.note": "Note",
    "type.custom": "Other",
    "grid.emptyCat": "No entries in this category yet",
    "sec.protected": "Protected",
    "sec.autolock": "Auto-lock in",
  },
};

let lang: Lang = ((): Lang => {
  try {
    const saved = localStorage.getItem("vaulty.lang");
    if (saved === "ru" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  return "ru";
})();

const listeners = new Set<() => void>();

export function getLang(): Lang {
  return lang;
}

export function setLang(l: Lang): void {
  lang = l;
  try {
    localStorage.setItem("vaulty.lang", l);
  } catch {
    /* ignore */
  }
  listeners.forEach((f) => f());
}

export function toggleLang(): void {
  setLang(lang === "ru" ? "en" : "ru");
}

export function onLangChange(f: () => void): () => void {
  listeners.add(f);
  return () => {
    listeners.delete(f);
  };
}

export function t(key: string): string {
  return DICTS[lang][key] ?? DICTS.en[key] ?? key;
}


