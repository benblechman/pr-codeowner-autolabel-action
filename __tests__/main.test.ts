import {codeownersFrom} from "../src/api";
import {getMatchingCodeownerLabels} from "../src/main";

let codeownerContent = `
/TestConfig/Domains/\t\t\t\t\t\t\t\t@teamA @teamB
/TestConfig/Domains/Foo\t\t\t\t\t\t\t\t@teamC
/DogFood/ @teamD @teamE @teamF               
*.js    @js-owner
codecov.yml @teamA
`

//create a map of labels to teams
let labelMap = new Map<string, string>()
labelMap.set("@teamA", "labelA")
labelMap.set("@teamB", "labelB")
labelMap.set("@teamC", "labelC")
labelMap.set("@teamD", "labelD")
labelMap.set("@teamE", "labelE")
labelMap.set("@js-owner", "javascript-owner")

describe('main', () => {
    it('getMatchingCodeownerLabels any owned file in directory', async () => {
        let changedFiles = ["TestConfig/Domains/Foundations/foo.txt"]
        let codeownerEntries = codeownersFrom(codeownerContent)

        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(2)
        expect(matchingLabels[0]).toBe("labelA")
        expect(matchingLabels[1]).toBe("labelB")
    })

    it('getMatchingCodeownerLabels specific override', async () => {
        let changedFiles = ["TestConfig/Domains/Foo/foo.txt"]
        let codeownerEntries = codeownersFrom(codeownerContent)

        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(1)
        expect(matchingLabels[0]).toBe("labelC")
    })

    it('getMatchingCodeownerLabels file wildcard', async () => {
        let changedFiles = ["TestConfig/Domains/Foo/javascript.js"]
        let codeownerEntries = codeownersFrom(codeownerContent)
        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(1)
        expect(matchingLabels[0]).toBe("javascript-owner")
    })

    it('getMatchingCodeownerLabels needs label map to label', async () => {
        let changedFiles = ["DogFood/typeScript.ts"]
        let codeownerEntries = codeownersFrom("/DogFood/ @teamD @teamE @teamF")
        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(2) //Would be 3 with teamF
        expect(matchingLabels[0]).toBe("labelD")
    })

    it('getMatchingCodeownerLabels . syntax hidden directory works', async () => {
        let changedFiles = [".github/CODEOWNERS"]
        let codeownerEntries = codeownersFrom("/.github/ @teamE")
        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(1)
        expect(matchingLabels[0]).toBe("labelE")
    })

    it('getMatchingCodeownerLabels override without subdir', async () => {
        let changedFiles = ["modules/BusinessComponents/BusinessComponents/ApplePayButton/ApplePayButton.swift",
            "modules/BusinessComponents/MyDog.swift"]
        let content = `
        /modules/BusinessComponents/                      @teamA
        /modules/BusinessComponents/BusinessComponents/AddressForm                  @Foo/ios-identity-team
        /modules/BusinessComponents/BusinessComponents/ApplePayButton               @teamB
        `
        let codeownerEntries = codeownersFrom(content)
        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries, labelMap, false))

        expect(matchingLabels.length).toBe(2)
        expect(matchingLabels[0]).toBe("labelB")
        expect(matchingLabels[1]).toBe("labelA")
    })

    it('getMatchingCodeownerLabels with no label map', async () => {
        let changedFiles = ["modules/BusinessComponents/BusinessComponents/ApplePayButton/ApplePayButton.swift",
            "modules/BusinessComponents/MyDog.swift"]
        let content = `
        /modules/BusinessComponents/                      @teamA
        /modules/BusinessComponents/BusinessComponents/AddressForm                  @Foo/ios-identity-team
        /modules/BusinessComponents/BusinessComponents/ApplePayButton               @teamB
        `
        let codeownerEntries = codeownersFrom(content)
        let matchingLabels = Array.from(getMatchingCodeownerLabels(changedFiles, codeownerEntries,  new Map<string, string>(), true))

        expect(matchingLabels.length).toBe(2)
        expect(matchingLabels[0]).toBe("teamB")
        expect(matchingLabels[1]).toBe("teamA")
    })
})