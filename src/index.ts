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

run(octokit, owner, repo, base).catch(error => setFailed(error.message));

async function run(octokit: Octokit, owner: string, repo: string, base: string) {
    const pulls = await octokit.paginate("GET /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        base
    }, res => res.data);

    const pullsOutOfDatePromises = pulls.map(pull => out_of_date(octokit, owner, repo, pull));
    const pullsOutOfDate = await Promise.all(pullsOutOfDatePromises);
    const pullsToRebase = filter === 'auto-merge' 
        ? pulls.filter(pull => pull.auto_merge !== null) 
        : pulls.filter((pull, index) => pullsOutOfDate[index]);

    if (filter === 'auto-merge' && pullsToRebase.length === 0) {
        console.log(`No PR's updated. There are ${pulls.length} PR's open, but none are on auto merge`);
        return;
    }

    await Promise.all(pullsToRebase.map(rebaseAndUpdate));
}

async function rebaseAndUpdate(pull: any) {
    try {
        const newSha = await rebasePullRequest({
            octokit,
            owner,
            pullRequestNumber: pull.number,
            repo
        });
        console.log(`updated PR "${pull.title}" to new HEAD ${newSha}`);
    } catch (error: any) {
        console.log(error.message);
        if (error instanceof Error && error.message === "Merge conflict") {
            console.log(`Could not update "${pull.title}" because of merge conflicts`);
        } else {
            throw error;
        }
    }
}

async function out_of_date(octokit: Octokit, owner: string, repo: string, pull: any): Promise<boolean> {
    const comparison = await octokit.rest.repos.compareCommits({
        owner,
        repo,
        base: pull.base.ref,
        head: pull.head.sha
    });

    return comparison.data.status === 'behind';
}
