/** Fields the Auth dashboard uses for the Display name column. */
export function displayNameMetadata(fullName: string) {
  const name = fullName.trim().replace(/\s+/g, " ");
  return {
    full_name: name,
    name,
    display_name: name,
  };
}

/** Signup stores given names separately, and the combined name for display. */
export function signupNameMetadata(firstName: string, lastName: string) {
  const first = firstName.trim();
  const last = lastName.trim();
  const full = `${first} ${last}`.replace(/\s+/g, " ").trim();
  return {
    first_name: first,
    last_name: last,
    ...displayNameMetadata(full),
  };
}
