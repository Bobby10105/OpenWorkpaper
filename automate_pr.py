#!/usr/bin/env python3
import os
import sys
import json
import urllib.request
import urllib.error

# Allowlist of GitHub handles authorized for autonomous merging (case-insensitive)
AUTHOR_ALLOWLIST = {
    "Bobby10105",
    "dependabot[bot]",
    "app/dependabot",
    "google-labs-jules"
}

OWNER = "Bobby10105"
REPO = "OpenWorkpaper"

# Sourced token fallback
DEFAULT_TOKEN = None

def get_headers(token):
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "Antigravity-PR-Gatekeeper"
    }

def make_request(url, method="GET", data=None, token=None):
    headers = get_headers(token)
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
        
    req = urllib.request.Request(url, headers=headers, method=method, data=req_data)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            if res_body:
                return json.loads(res_body), response.status
            return None, response.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e else ""
        print(f"HTTP Error {e.code} on {method} {url}: {err_body}", file=sys.stderr)
        raise e
    except Exception as e:
        print(f"Error on {method} {url}: {e}", file=sys.stderr)
        raise e

def check_ci_status(sha, token):
    """
    Checks the status of all CI/CD pipelines (both legacy Commit Statuses and modern Check Runs)
    for the specified commit SHA.
    
    Returns one of: 'success', 'pending', or 'failure'.
    """
    # 1. Fetch legacy commit status
    status_url = f"https://api.github.com/repos/{OWNER}/{REPO}/commits/{sha}/status"
    status_res, _ = make_request(status_url, token=token)
    
    # 2. Fetch check runs (from GitHub Actions, etc.)
    runs_url = f"https://api.github.com/repos/{OWNER}/{REPO}/commits/{sha}/check-runs"
    runs_res, _ = make_request(runs_url, token=token)
    
    legacy_state = status_res.get("state")  # success, pending, failure, error
    legacy_statuses = status_res.get("statuses", [])
    
    check_runs = runs_res.get("check_runs", [])
    
    # Determine check runs state
    runs_pending = False
    runs_failed = False
    runs_success = True
    
    if check_runs:
        for run in check_runs:
            status = run.get("status")  # queued, in_progress, completed
            conclusion = run.get("conclusion")  # success, failure, neutral, cancelled, timed_out, etc.
            
            if status in ["queued", "in_progress"]:
                runs_pending = True
                runs_success = False
            elif status == "completed":
                if conclusion in ["failure", "timed_out", "action_required", "cancelled"]:
                    runs_failed = True
                    runs_success = False
                elif conclusion in ["success", "neutral", "skipped"]:
                    pass
                else:
                    runs_failed = True
                    runs_success = False
            else:
                runs_failed = True
                runs_success = False
    
    # Determine legacy statuses state
    legacy_pending = False
    legacy_failed = False
    legacy_success = True
    
    if legacy_statuses:
        if legacy_state in ["failure", "error"]:
            legacy_failed = True
            legacy_success = False
        elif legacy_state == "pending":
            legacy_pending = True
            legacy_success = False
        elif legacy_state == "success":
            legacy_success = True
            
    # Combine states
    if legacy_failed or runs_failed:
        return "failure"
    if legacy_pending or runs_pending:
        return "pending"
    if legacy_success and runs_success:
        return "success"
        
    return "pending"

def comment_on_pr(pr_number, comment_body, token):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/issues/{pr_number}/comments"
    print(f"Leaving comment on PR #{pr_number}...")
    make_request(url, method="POST", data={"body": comment_body}, token=token)

def merge_pr(pr_number, token):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls/{pr_number}/merge"
    print(f"Merging PR #{pr_number} via squash-and-merge...")
    data = {
        "merge_method": "squash"
    }
    res, status = make_request(url, method="PUT", data=data, token=token)
    if status == 200:
        print(f"Successfully merged PR #{pr_number}.")
        return True
    else:
        print(f"Failed to merge PR #{pr_number}: {res}", file=sys.stderr)
        return False

def delete_branch(branch_name, token):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}/git/refs/heads/{branch_name}"
    print(f"Deleting source branch {branch_name}...")
    try:
        make_request(url, method="DELETE", token=token)
        print(f"Successfully deleted branch {branch_name}.")
    except Exception as e:
        print(f"Failed to delete branch {branch_name}: {e}", file=sys.stderr)

def main():
    token = os.environ.get("GITHUB_TOKEN", DEFAULT_TOKEN)
    if not token:
        print("Error: No GitHub token provided in GITHUB_TOKEN environment variable.", file=sys.stderr)
        sys.exit(1)
        
    print("Fetching open Pull Requests...")
    pulls_url = f"https://api.github.com/repos/{OWNER}/{REPO}/pulls?state=open"
    try:
        prs, _ = make_request(pulls_url, token=token)
    except Exception as e:
        print(f"Failed to fetch Pull Requests: {e}", file=sys.stderr)
        sys.exit(1)
        
    if not prs:
        print("No open Pull Requests found.")
        return

    allowlist_lower = {name.lower() for name in AUTHOR_ALLOWLIST}
    
    for pr in prs:
        pr_number = pr["number"]
        pr_title = pr["title"]
        author = pr["user"]["login"]
        target_branch = pr["base"]["ref"]
        source_branch = pr["head"]["ref"]
        head_sha = pr["head"]["sha"]
        
        print(f"\nEvaluating PR #{pr_number}: '{pr_title}' targeting '{target_branch}'")
        
        # Gate 1: Check target branch (only main or default branch)
        if target_branch != "main":
            print(f"  Skipping: targets branch '{target_branch}', not 'main'.")
            continue
            
        # Gate 2: Check author allowlist
        if author.lower() not in allowlist_lower:
            print(f"  Skipping: author '{author}' is not in the trusted allowlist.")
            continue
            
        print(f"  Passed Author Gate: '{author}' is a trusted author.")
        
        # Gate 3: Check CI status
        print(f"  Checking CI status for commit {head_sha}...")
        try:
            ci_state = check_ci_status(head_sha, token)
        except Exception as e:
            print(f"  Skipping: Error checking status checks: {e}")
            continue
            
        print(f"  CI Status: {ci_state}")
        
        if ci_state == "pending":
            print(f"  PR #{pr_number} has pending status checks. Skipping for now.")
            continue
        elif ci_state == "failure":
            print(f"  PR #{pr_number} has failing status checks. Aborting merge and commenting.")
            comment_body = f"@{author} Autonomous merge aborted: CI status checks are failing. Please fix the build errors."
            try:
                comment_on_pr(pr_number, comment_body, token)
            except Exception as e:
                print(f"  Failed to leave comment: {e}", file=sys.stderr)
            continue
        elif ci_state == "success":
            print(f"  PR #{pr_number} has passing status checks. Ready to merge.")
            
            # Step 4: Execute Merge Workflow
            comment_body = "Merged autonomously by Antigravity task: Trusted Author + Passing Tests."
            try:
                # Add comment
                comment_on_pr(pr_number, comment_body, token)
                
                # Execute merge
                merged = merge_pr(pr_number, token)
                
                # Delete branch if source is in the same repo
                if merged:
                    is_same_repo = pr["head"]["repo"]["id"] == pr["base"]["repo"]["id"]
                    if is_same_repo:
                        delete_branch(source_branch, token)
                    else:
                        print(f"  Source branch is in a fork. Skipping branch deletion.")
            except Exception as e:
                print(f"  Workflow failed for PR #{pr_number}: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()
