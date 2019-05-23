import "jest"
import InternetObject from "../src/";

// Quickly tests any concept.
// Run `jest try` command.
// Do not need to push changes in the repository
// unless required need to be preserved temporarily.

describe("Internet Object Trial", () => {
  it("Test 1", () => {
    const s1 = "Aamir, Maniar"
    const io = new InternetObject(s1).data

    console.log(io)
  })
})
