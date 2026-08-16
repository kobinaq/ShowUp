import { personOnAssignment } from "@/lib/services/rep-identity";

describe("personOnAssignment", () => {
  it("returns the person on the latest assignment", () => {
    const person = { id: "ada", realEmail: "ada@school.edu" };
    expect(personOnAssignment({ sealedIdentity: person })).toEqual(person);
  });

  it("returns null when the profile has no assignment", () => {
    expect(personOnAssignment(null)).toBeNull();
  });
});
