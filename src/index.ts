import {
    getInput,
    setFailed,
} from "@actions/core";
import { context } from "@actions/github";
import { Octokit } from "@octokit/rest";

const { rebasePullRequest } = require('github-rebase');

const token = getInput('github_token')
const filter = getInput('filter')
if (!['always', 'auto-merge'].includes(filter)) {
    setFailed("Illegal filter used");
}

const octokit = new Octokit({ auth: token });

const owner = context.repo.owner
const repo = context.repo.repo
const base = context.ref
console.log(`Owner: ${owner}`)
console.log(`Repository: ${repo}`)
console.log(`Current branch: ${base}`)

try {
    run(octokit, owner, repo, base);
} catch(error: any) {
    setFailed(error.message);
}

async function run(octokit: Octokit, owner: string, repo: string, base: string) {
    const pulls = await octokit.paginate("GET /repos/{owner}/{repo}/pulls", {
        owner: owner,
        repo: repo,
        base: base
    }, res => res.data);
    
    let pullsToRebase;
    if (filter === 'auto-merge') {
        pullsToRebase = pulls.filter(pull => pull.auto_merge !== null)

        if (pullsToRebase.length === 0) {
            console.log(`No PR's updated. There are ${pulls.length} PR's open, but none are on auto merge`)
        }
    } else {
        pullsToRebase = pulls
    }

    await Promise.all(pullsToRebase.map(async (pull) => {
        try {
            const newSha = await rebasePullRequest({
                octokit,
                owner: owner,
                pullRequestNumber: pull.number,
                repo: repo
            })
            console.log(`updated PR "${pull.title}" to new HEAD ${newSha}`)
        } catch(error: any) {
            console.log(error.message)
            if (error instanceof Error && error.message === "Merge conflict") {
                console.log(`Could not update "${pull.title}" because of merge conflicts`)
            } else {
                throw error;
            }
        }
    }));
}
