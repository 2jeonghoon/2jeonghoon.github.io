import assert from "node:assert/strict";
import {test} from "node:test";
import {createPostService} from "../worker/src/post-service.mjs";

import {
  GitHubError,
  createGitHubContentsClient,
  createInstallationToken,
  exchangeOAuthCode,
  fetchOAuthUser
} from "../worker/src/github.mjs";

function response(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {"content-type": "application/json", ...headers}
  });
}

test("lists 107 published and draft posts within the Worker subrequest budget", async () => {
  const entries = Array.from({length: 107}, (_, index) => ({name: `post-${index}.md`, path: `posts/post-${index}.md`, sha: `sha-${index}`}));
  let calls = 0;
  const client = createGitHubContentsClient({token: "token", fetchImpl: async (url, init) => {
    assert.ok(++calls < 50, "Worker external subrequest budget exceeded");
    if (url.includes("/contents/posts?")) return response(entries);
    assert.equal(url, "https://api.github.com/graphql");
    const query = JSON.parse(init.body).query;
    const repository = {};
    for (const match of query.matchAll(/(post\d+): object\(expression: "sha-(\d+)"\)/g)) {
      repository[match[1]] = {oid: `sha-${match[2]}`, text: `---\ntitle: Post ${match[2]}\ndescription: Test\ndate: '2026-10-20'\ncategory: Test\ntags: [test]\naiGenerated: false\ndraft: ${Number(match[2]) % 2 === 0}\n---\nBody`, isTruncated: false};
    }
    return response({data: {repository}});
  }});
  const posts = await createPostService(client).list();
  assert.equal(posts.length, 107);
  assert.ok(posts.some(post => post.draft));
  assert.ok(posts.some(post => !post.draft));
  assert.ok(calls <= 7);
});

async function privateKeyPem() {
  const pair = await crypto.subtle.generateKey(
    {name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"},
    true,
    ["sign", "verify"]
  );
  const bytes = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const base64 = Buffer.from(bytes).toString("base64").match(/.{1,64}/g).join("\n");
  return `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;
}

test("exchanges an OAuth code without exposing it in the URL", async () => {
  let captured;
  const token = await exchangeOAuthCode({
    code: "one-time-code",
    clientId: "client",
    clientSecret: "secret",
    redirectUri: "https://admin.example/auth/callback",
    fetchImpl: async (url, init) => {
      captured = {url, init};
      return response({access_token: "user-token"});
    }
  });
  assert.equal(token, "user-token");
  assert.equal(captured.url, "https://github.com/login/oauth/access_token");
  assert.equal(JSON.parse(captured.init.body).code, "one-time-code");
});

test("fetches the authenticated immutable GitHub identity", async () => {
  const user = await fetchOAuthUser({
    token: "user-token",
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://api.github.com/user");
      assert.equal(init.headers.Authorization, "Bearer user-token");
      return response({id: 51705815, login: "2jeonghoon"});
    }
  });
  assert.deepEqual(user, {id: 51705815, login: "2jeonghoon"});
});

test("requests an installation token scoped to the one repository", async () => {
  const now = Date.UTC(2026, 8, 23, 1, 0, 0);
  let captured;
  const token = await createInstallationToken({
    appId: "123",
    privateKey: await privateKeyPem(),
    installationId: "456",
    now,
    fetchImpl: async (url, init) => {
      captured = {url, init};
      return response({token: "installation-token"});
    }
  });
  assert.equal(token, "installation-token");
  const jwt = captured.init.headers.Authorization.replace("Bearer ", "");
  const claims = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString());
  assert.deepEqual(claims, {iat: Math.floor(now / 1000) - 60, exp: Math.floor(now / 1000) + 540, iss: "123"});
  assert.equal(captured.url, "https://api.github.com/app/installations/456/access_tokens");
  assert.deepEqual(JSON.parse(captured.init.body), {repository_ids: [781249964], permissions: {contents: "write"}});
});

test("verifies repository identity and lists only Markdown post entries", async () => {
  const calls = [];
  const client = createGitHubContentsClient({
    token: "installation-token",
    fetchImpl: async url => {
      calls.push(url);
      if (url.endsWith("/repos/2jeonghoon/2jeonghoon.github.io")) return response({id: 781249964});
      return response([{name: "one.md", path: "posts/one.md", sha: "a"}, {name: "note.txt", path: "posts/note.txt", sha: "b"}]);
    }
  });
  await client.verifyRepository();
  assert.deepEqual(await client.listPostEntries(), [{name: "one.md", path: "posts/one.md", sha: "a"}]);
  assert.equal(calls.length, 2);
});

test("encodes and decodes Unicode post bodies", async () => {
  const seen = [];
  const client = createGitHubContentsClient({
    token: "token",
    fetchImpl: async (url, init) => {
      seen.push({url, init});
      if (!init.method) return response({sha: "old", content: Buffer.from("한글 본문").toString("base64")});
      return response({content: {sha: "new"}, commit: {sha: "commit"}});
    }
  });
  assert.deepEqual(await client.getPost("safe-post"), {sha: "old", source: "한글 본문"});
  await client.createPost("safe-post", "새 글");
  assert.equal(Buffer.from(JSON.parse(seen[1].init.body).content, "base64").toString(), "새 글");
  assert.equal(seen[1].url.includes("posts/safe-post.md"), true);
});

test("reads and updates the root category catalog with SHA concurrency", async () => {
  const seen = [];
  const categories = [
    {name: "Systems", children: [{name: "Linux"}]},
    {name: "Game Client", children: []}
  ];
  const client = createGitHubContentsClient({
    token: "token",
    fetchImpl: async (url, init = {}) => {
      seen.push({url, init});
      if (!init.method) {
        return response({
          sha: "categories-old",
          content: Buffer.from(JSON.stringify({categories})).toString("base64")
        });
      }
      return response({content: {sha: "categories-new"}, commit: {sha: "category-commit"}});
    }
  });

  assert.deepEqual(await client.getCategoryConfig(), {
    sha: "categories-old",
    categories
  });
  await client.writeCategoryConfig(categories, "categories-old");

  assert.equal(seen[0].url, "https://api.github.com/repos/2jeonghoon/2jeonghoon.github.io/contents/categories.json?ref=main");
  assert.equal(seen[1].url, "https://api.github.com/repos/2jeonghoon/2jeonghoon.github.io/contents/categories.json");
  const payload = JSON.parse(seen[1].init.body);
  assert.equal(payload.sha, "categories-old");
  assert.equal(payload.branch, "main");
  assert.equal(
    Buffer.from(payload.content, "base64").toString(),
    `${JSON.stringify({categories}, null, 2)}\n`
  );
});

test("requires SHA for update and delete before making a request", async () => {
  let calls = 0;
  const client = createGitHubContentsClient({token: "token", fetchImpl: async () => { calls += 1; return response({}); }});
  await assert.rejects(client.updatePost("safe-post", "body", ""), /sha is required/i);
  await assert.rejects(client.deletePost("safe-post", ""), /sha is required/i);
  assert.equal(calls, 0);
});

test("maps conflicts and never retries an ambiguous write", async () => {
  let conflictCalls = 0;
  const conflict = createGitHubContentsClient({
    token: "token",
    fetchImpl: async () => { conflictCalls += 1; return response({message: "conflict"}, 409); }
  });
  await assert.rejects(conflict.updatePost("safe-post", "body", "sha"), error => error instanceof GitHubError && error.code === "conflict");
  assert.equal(conflictCalls, 1);

  let networkCalls = 0;
  const network = createGitHubContentsClient({
    token: "token",
    fetchImpl: async () => { networkCalls += 1; throw new TypeError("network failed"); }
  });
  await assert.rejects(network.createPost("safe-post", "body"), error => error instanceof GitHubError && error.code === "ambiguous_write");
  assert.equal(networkCalls, 1);
});

test("rejects every unsafe slug before constructing a GitHub request", async () => {
  let calls = 0;
  const client = createGitHubContentsClient({token: "token", fetchImpl: async () => { calls += 1; return response({}); }});
  for (const slug of ["../x", "%2e%2e", "%252e%252e", "Bad-Slug", "a/b", "a\\b", "a_b"]) {
    await assert.rejects(client.getPost(slug), /invalid slug/i);
  }
  assert.equal(calls, 0);
});
test("reads discussion comments and replies in newest-first order", async () => {
  const pageInfo = {hasPreviousPage: false, hasNextPage: false};
  const reply = {id: "reply", body: "Reply", createdAt: "2026-10-19T00:00:00Z", url: "https://github.com/reply", author: null};
  const parent = {id: "parent", body: "First", createdAt: "2026-10-18T00:00:00Z", url: "https://github.com/comment", author: {login: "reader"}, replies: {pageInfo, nodes: [reply]}};
  const discussion = {title: "safe-post", comments: {pageInfo, nodes: [parent]}};
  const payload = {data: {repository: {discussions: {pageInfo, nodes: [discussion]}}}};
  const client = createGitHubContentsClient({token: "test", fetchImpl: async () => response(payload)});
  const result = await client.listComments();
  assert.deepEqual(result.comments.map(item => item.id), ["reply", "parent"]);
  assert.equal(result.comments[0].author, "탈퇴한 사용자");
  assert.equal(result.limited, false);
});

test("does not treat GraphQL permission errors as an empty inbox", async () => {
  const client = createGitHubContentsClient({token: "test", fetchImpl: async () => response({errors: [{message: "Forbidden"}]})});
  await assert.rejects(client.listComments(), {status: 502});
});

test("paginates parents so a recent reply on an older comment is included", async () => {
  const pageInfo = {hasNextPage: false};
  const reply = {id: "new-reply", body: "Recent", createdAt: "2026-10-19T00:00:00Z", author: null};
  const parent = {id: "old", body: "Old", createdAt: "2026-01-01T00:00:00Z", replies: {pageInfo, nodes: [reply]}};
  let calls = 0;
  const client = createGitHubContentsClient({token: "test", fetchImpl: async () => response(++calls === 1
    ? {data: {repository: {discussions: {pageInfo, nodes: [{id: "discussion", title: "safe-post", comments: {pageInfo: {hasNextPage: true, endCursor: "next"}, nodes: []}}]}}}}
    : {data: {node: {comments: {pageInfo, nodes: [parent]}}}})});
  const result = await client.listComments();
  assert.equal(result.comments[0].id, "new-reply");
  assert.equal(calls, 2);
  assert.equal(result.limited, false);
});

test("requests a separate read-only discussions token", async () => {
  await createInstallationToken({appId: "123", privateKey: await privateKeyPem(), installationId: "456", permissions: {discussions: "read"}, fetchImpl: async (url, init) => {
    assert.deepEqual(JSON.parse(init.body), {repository_ids: [781249964], permissions: {discussions: "read"}});
    return response({token: "read-only-token"});
  }});
});
