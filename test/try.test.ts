import "jest"
import InternetObject from "../src/";



describe("Internet Object Trial", () => {
  it("Test 1", () => {
    const s1 = "Aamir, Maniar"
    const io = new InternetObject(s1).data

    console.log(io)
  })
})
