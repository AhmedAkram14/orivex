// A global, doctor-agnostic non-working date (docs/05-information-
// architecture.md / frontend's Holiday type). Read-only in this phase: no
// use case creates one yet (a future Admin feature will populate the
// table), so this entity only ever gets reconstituted from persistence.
export class Holiday {
  private constructor(
    private readonly id: string,
    private readonly date: string,
    private readonly name: string,
  ) {}

  static reconstitute(props: { id: string; date: string; name: string }): Holiday {
    return new Holiday(props.id, props.date, props.name);
  }

  getId(): string {
    return this.id;
  }

  getDate(): string {
    return this.date;
  }

  getName(): string {
    return this.name;
  }
}
