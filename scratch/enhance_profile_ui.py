import re

with open("frontend/src/pages/Profile.vue", "r", encoding="utf-8") as f:
    content = f.read()

# Make flat-card-container sharper and add shadow
content = re.sub(
    r"(\.flat-card-container\s*{[^}]*)(})",
    r"\1  box-shadow: 4px 4px 0px 0px #0f172a;\n  border-radius: 0 !important;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.flat-card-container\s*{[^}]*)(})",
    r"\1  box-shadow: 4px 4px 0px 0px #2dd4bf !important;\n\2",
    content
)

# Stat box
content = re.sub(
    r"(\.stat-flat-box\s*{[^}]*)(})",
    r"\1  box-shadow: 2px 2px 0px 0px #0f172a;\n  border-radius: 0 !important;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.stat-flat-box\s*{[^}]*)(})",
    r"\1  border-color: #f8fafc !important;\n  box-shadow: 2px 2px 0px 0px #2dd4bf !important;\n\2",
    content
)

# Text fields and switches
content = re.sub(
    r"(\.flat-text-field\s*:deep\(\.v-field\)\s*{[^}]*)(})",
    r"\1  border-radius: 0 !important;\n\2",
    content
)

# Buttons
content = re.sub(
    r"(\.btn-flat-solid\s*{[^}]*)(})",
    r"\1  box-shadow: 3px 3px 0px 0px #0f172a;\n  border-radius: 0 !important;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.btn-flat-solid\s*{[^}]*)(})",
    r"\1  box-shadow: 3px 3px 0px 0px #2dd4bf !important;\n\2",
    content
)

content = re.sub(
    r"(\.btn-flat-outline\s*{[^}]*)(})",
    r"\1  box-shadow: 3px 3px 0px 0px #0f172a;\n  border-radius: 0 !important;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.btn-flat-outline\s*{[^}]*)(})",
    r"\1  box-shadow: 3px 3px 0px 0px #2dd4bf !important;\n\2",
    content
)

content = re.sub(
    r"(\.avatar-action-btn\s*{[^}]*)(})",
    r"\1  border-radius: 0 !important;\n  box-shadow: 2px 2px 0px 0px #0f172a;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.avatar-action-btn\s*{[^}]*)(})",
    r"\1  box-shadow: 2px 2px 0px 0px #2dd4bf !important;\n\2",
    content
)

content = re.sub(
    r"(\.custom-badge\s*{[^}]*)(})",
    r"\1  border-radius: 0 !important;\n\2",
    content
)

content = re.sub(
    r"(\.preference-flat-card\s*{[^}]*)(})",
    r"\1  border-radius: 0 !important;\n  box-shadow: 2px 2px 0px 0px #0f172a;\n\2",
    content
)
content = re.sub(
    r"(:deep\(\.v-theme--dark\)\s*\.preference-flat-card\s*{[^}]*)(})",
    r"\1  box-shadow: 2px 2px 0px 0px #2dd4bf !important;\n\2",
    content
)

with open("frontend/src/pages/Profile.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("Applied clean design enhancements to Profile.vue")
