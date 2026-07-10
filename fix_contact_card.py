path = 'app/circles/CirclesClient.js'
with open(path) as f:
    content = f.read()

# Find and replace ContactCard function entirely
start = content.find('function ContactCard({ contact, onDeleteClick, onOpenProfile })')
if start == -1:
    print('ContactCard not found')
    exit()

# Find the end of ContactCard - next function definition
end = content.find('\nfunction ', start + 10)
old = content[start:end]
print('Found ContactCard, length:', len(old))

new = '''function ContactCard({ contact, onDeleteClick, onOpenProfile }) {
  const isClickable = Boolean(contact.matchedProfileId && onOpenProfile);
  function handleProfileClick() {
    if (isClickable) onOpenProfile({ userId: contact.matchedProfileId, name: contact.name, avatarUrl: contact.avatarUrl, initials: contact.initials });
  }
  return (
    <article className={`rounded-[22px] border border-[#f0dfd6] bg-white p-4 shadow-sm transition-all duration-150 ${isClickable ? "hover:-translate-y-0.5 hover:shadow-md hover:border-[#e8c9bc]" : ""}`}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleProfileClick}
          disabled={!isClickable}
          className="relative h-11 w-11 shrink-0 rounded-full disabled:cursor-default"
        >
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt={contact.name || "Contact"}
              className="h-11 w-11 rounded-full object-cover"
            />
          ) : (
            <div className={getAvatarClasses(contact.colors, contact.status, "lg")}>
              {contact.initials}
            </div>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={handleProfileClick}
            disabled={!isClickable}
            className={`text-sm font-semibold text-slate-900 disabled:cursor-default ${isClickable ? "hover:text-[#d96d4f]" : ""} transition-colors`}
          >
            {contact.name}
          </button>
          <p className="text-xs text-slate-500">
            {contact.role || "Friend"}{contact.note ? ` · ${contact.note}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDeleteClick(contact)}
          className="inline-flex h-9 items-center justify-center rounded-full border border-[#efc0ba] bg-[#fff4f2] px-3 text-[12px] font-semibold text-[#b14f43] hover:bg-[#ffe9e5]"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
'''

content = content[:start] + new + content[end:]
with open(path, 'w') as f:
    f.write(content)
print('OK')
