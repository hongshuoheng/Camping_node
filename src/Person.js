export default class Person {
  constructor(name = "noname", age = 12) {
    this.name = name;
    this.age = age;
  }
  toString() {
    return JSON.stringify(this);
  }
}
