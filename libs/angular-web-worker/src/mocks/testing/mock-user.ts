export class MockUser {
  public name: string;
  public age: number;

  constructor(user: Pick<MockUser, 'age' | 'name'>) {
    this.age = user.age;
    this.name = user.name;
  }

  public birthday(): void {
    this.age += 1;
  }
}
