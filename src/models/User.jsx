export class User {
  constructor({ id, name, email } = {}) {
    this.id = id ?? "";
    this.name = name ?? "";
    this.email = email ?? "";
  }

  static fromJSON(json) {
    return new User({
      id: json.id ?? json._id,
      name: json.name,
      email: json.email,
    });
  }
}