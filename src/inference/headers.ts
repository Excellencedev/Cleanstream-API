// Field name mappings for common aliases
const FIELD_ALIASES: Record<string, string[]> = {
  email: [
    "email",
    "e-mail",
    "email_address",
    "emailaddress",
    "user_email",
    "useremail",
    "contact_email",
    "mail",
  ],
  phone: [
    "phone",
    "phone_number",
    "phonenumber",
    "telephone",
    "tel",
    "mobile",
    "cell",
    "contact_phone",
  ],
  name: [
    "name",
    "full_name",
    "fullname",
    "customer_name",
    "user_name",
    "username",
  ],
  first_name: ["first_name", "firstname", "fname", "given_name", "givenname"],
  last_name: ["last_name", "lastname", "lname", "surname", "family_name"],
  address: [
    "address",
    "street_address",
    "streetaddress",
    "addr",
    "street",
    "address_line_1",
  ],
  city: ["city", "town", "municipality"],
  state: ["state", "province", "region"],
  zip: ["zip", "zipcode", "zip_code", "postal_code", "postalcode", "postcode"],
  country: ["country", "nation", "country_code"],
  date: ["date", "created_date", "created_at", "createdat", "timestamp"],
  amount: ["amount", "total", "total_amount", "price", "cost", "value", "sum"],
  id: ["id", "identifier", "record_id", "customer_id", "user_id", "order_id"],
  description: ["description", "desc", "details", "notes", "comments"],
  status: ["status", "state", "condition"],
  quantity: ["quantity", "qty", "count", "num", "number"],
};

// Create reverse lookup
const ALIAS_TO_CANONICAL = new Map<string, string>();
for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
  for (const alias of aliases) {
    ALIAS_TO_CANONICAL.set(alias, canonical);
  }
}

export function inferFieldRelationship(header: string): string {
  const normalized = header
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");

  // Check for exact match
  if (ALIAS_TO_CANONICAL.has(normalized)) {
    return ALIAS_TO_CANONICAL.get(normalized)!;
  }

  // Check for partial match (field contains alias)
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias) || alias.includes(normalized)) {
        return canonical;
      }
    }
  }

  // Return the normalized header as-is
  return normalized;
}

export function normalizeHeaders(headers: string[]): string[] {
  const normalized = headers.map(inferFieldRelationship);

  // Handle duplicate normalized names by adding suffix
  const counts = new Map<string, number>();
  return normalized.map((name) => {
    const count = counts.get(name) || 0;
    counts.set(name, count + 1);
    return count > 0 ? `${name}_${count + 1}` : name;
  });
}
