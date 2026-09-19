import test from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import { create } from "zustand"
import ts from "typescript"

function createStore(api) {
  const source = fs.readFileSync(
    new URL("../stores/useProjectStore.ts", import.meta.url),
    "utf8"
  )
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const compiledModule = { exports: {} }
  new Function("require", "module", "exports", output)(
    (name) => (name === "@/lib/api" ? api : { create }),
    compiledModule,
    compiledModule.exports
  )
  return compiledModule.exports.useProjectStore
}
const deferred = () => {
  let resolve
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}
const flush = () => new Promise((done) => setImmediate(done))

test("a created project appears immediately and survives an older sidebar response", async () => {
  const old = deferred()
  const fresh = deferred()
  let reads = 0
  const saved = { _id: "new", clientName: "New project" }
  const store = createStore({
    getProjects: () => (++reads === 1 ? old.promise : fresh.promise),
    createProject: async () => saved,
  })
  const first = store.getState().fetchProjects()
  assert.equal(store.getState().fetchProjects(), first)
  await store
    .getState()
    .createProject({ clientName: "New project", description: "Test" })
  assert.deepEqual(store.getState().projects, [saved])
  old.resolve([])
  await first
  assert.deepEqual(store.getState().projects, [saved])
  fresh.resolve([saved, { _id: "existing" }])
  await flush()
  assert.equal(store.getState().projects.length, 2)
})

test("campaign creation, editing, and deletion update the sidebar's shared cache", async () => {
  const campaign = { _id: "c1", project: "p1", title: "Launch" }
  const store = createStore({
    getCampaigns: async () => [],
    createCampaign: async () => ({ campaign }),
    updateCampaign: async () => ({ ...campaign, title: "Edited" }),
    deleteCampaign: async () => {},
  })
  await store.getState().fetchCampaigns("p1")
  await store
    .getState()
    .createCampaign({
      project_id: "p1",
      title: "Launch",
      url: "https://example.com",
    })
  assert.deepEqual(store.getState().campaignsByProject.p1, [campaign])
  await store
    .getState()
    .updateCampaign("c1", { title: "Edited", url: "https://example.com" })
  assert.equal(store.getState().campaignsByProject.p1[0].title, "Edited")
  await store.getState().deleteCampaign("c1")
  assert.deepEqual(store.getState().campaignsByProject.p1, [])
})

test("a failed refresh retains projects and exposes a retryable error", async () => {
  const store = createStore({
    getProjects: async () => {
      throw Error("offline")
    },
  })
  store.setState({ projects: [{ _id: "kept" }] })
  await store.getState().fetchProjects()
  assert.equal(store.getState().projects[0]._id, "kept")
  assert.equal(store.getState().projectsLoading, false)
  assert.equal(store.getState().projectsError, "Could not load projects.")
})

test("campaign fetches for different projects remain independent during creation", async () => {
  const delayed = deferred()
  const store = createStore({
    getCampaigns: () => delayed.promise,
    createCampaign: async () => ({ campaign: { _id: "a", project: "p1" } }),
  })
  const pending = store.getState().fetchCampaigns("p2")
  await store
    .getState()
    .createCampaign({
      project_id: "p1",
      title: "Launch",
      url: "https://example.com",
    })
  delayed.resolve([{ _id: "b", project: "p2" }])
  await pending
  assert.equal(store.getState().campaignsByProject.p1[0]._id, "a")
  assert.equal(store.getState().campaignsByProject.p2[0]._id, "b")
})
