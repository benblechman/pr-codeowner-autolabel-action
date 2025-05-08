/**
 * Draws heavily from https://github.com/actions/labeler/blob/main/src/api/*.ts
 */

import * as github from '@actions/github'
import { ClientType } from './types'
import * as core from '@actions/core'

export const setLabels = async (
  client: ClientType,
  prNumber: number,
  labels: string[]
) => {
  await client.rest.issues.setLabels({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    issue_number: prNumber,
    labels
  })
}

export const getChangedFiles = async (
  client: ClientType,
  prNumber: number
): Promise<string[]> => {
  const listFilesOptions = client.rest.pulls.listFiles.endpoint.merge({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    pull_number: prNumber
  })

  const listFilesResponse = await client.paginate(listFilesOptions)
  const changedFiles = listFilesResponse.map((f: any) => f.filename)

  core.debug('found changed files:')
  for (const file of changedFiles) {
    core.debug(`  ${file}`)
  }

  return changedFiles
}

export async function getPullRequest(client: ClientType, prNumber: number) {
  let prData: any

  try {
    const result = await client.rest.pulls.get({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: prNumber
    })
    prData = result.data
  } catch (error: any) {
    core.warning(`Could not find pull request #${prNumber}, skipping`)
    return
  }

  core.debug(`fetching changed files for pr #${prNumber}`)
  const changedFiles: string[] = await getChangedFiles(client, prNumber)
  if (!changedFiles.length) {
    core.warning(`Pull request #${prNumber} has no changed files, skipping`)
    return
  }

  return {
    data: prData,
    number: prNumber,
    changedFiles
  }
}

export interface CodeownerEntry {
  glob: string
  teams: string[]
}

export async function getCodeowners(
  client: ClientType,
  prNumber: number,
  filePath = 'CODEOWNERS'
) {
  core.debug(`fetching codeowners for pr #${prNumber} from path ${filePath}`)
  let fileContent: string

  try {
    const result = await client.rest.repos.getContent({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      path: filePath,
      ref: github.context.sha
    })
    fileContent = Buffer.from(
      // @ts-expect-error false positive
      result.data.content,
      // @ts-expect-error false positive
      result.data.encoding
    ).toString()
  } catch (error: any) {
    core.warning(
      `Could not find pull request #${prNumber}, skipping (${error.message})`
    )
    return []
  }
  let codeowners = codeownersFrom(fileContent)
  if (!codeowners.length) {
    core.warning(`Pull request #${prNumber} has no codeowners`)
  }

  core.debug("codeowners: \n" + codeowners.map((entry) => { `glob: ${entry.glob} teams: ${entry.teams}`}))
  return codeowners
}

export function codeownersFrom(fileContent: string) {
  // rm newlines & comments; convert to array of 2-tupes, <glob, team>
  const codeowners: CodeownerEntry[] = fileContent
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .filter(line => !line.startsWith('#'))
    .map((line) : CodeownerEntry => {
      let lineTokens = line.trim().split(/\s/).filter(token => { return token.length > 0 })
      var glob = lineTokens[0]
      var teams: string[] = []
      if (lineTokens.length > 1) {
        teams = lineTokens.slice(1, lineTokens.length)
      }

      core.debug(`Processing glob: ${glob} teams: ${teams}`)
      if ( teams.length === 0 ||
          (teams.length === 1 && teams[0] === undefined)) {
        core.debug(`WARNING: CODEOWNERS had glob ${glob} w/o matching team`)
      }
      return { glob: glob, teams: teams }
    })
    .map((entry) => {
      // do some munging to support CODEOWNER format globs
      var finalGlob = entry.glob
      if (finalGlob.startsWith('*')) {
        // convert absolute paths like /foo/bar to foo/bar
        finalGlob = "**/" + finalGlob
      }
      // convert directories like foo/ to foo/**
      if (finalGlob.endsWith('/')){
        finalGlob += '**'
      } else {
        // convert directories like foo to foo/**
        const last = finalGlob.split('\\').pop()?.split('/').pop()
        if (!last?.includes('.')) {
          finalGlob += '/**'
        }
      }
      core.debug(`finalGlob: ${finalGlob} teams: ${entry.teams}`)

      return { glob: finalGlob, teams: entry.teams } as CodeownerEntry
    })
  return codeowners
}

