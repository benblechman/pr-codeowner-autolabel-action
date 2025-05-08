import {CodeownerEntry, codeownersFrom, getCodeowners} from "../src/api";

describe('api', () => {
    it('codeownersFrom works as expected', async () => {
        let content =
            `
                /TestConfig/Domains/\t\t\t\t\t\t\t\t@teamA @teamB
                /TestConfig/Domains/Foo\t\t\t\t\t\t\t\t@teamC
                /DogFood @teamD @teamE @teamF               
            `

        let codeowners = codeownersFrom(content)
        expect(codeowners.length == 3)
        expect(codeowners[0].glob).toBe("/TestConfig/Domains/**")
        expect(codeowners[0].teams.length).toBe(2)
    })
})