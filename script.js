"use strict";

// ==================================================
// 1. BANKER'S ALGORITHM: INITIAL RESOURCE DATA
// ==================================================

const resourceNames = ["A", "B", "C"];

const allocation = [
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2]
];

const maximum = [
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3]
];

const available = [3, 3, 2];

const originalAllocation = allocation.map(row => [...row]);
const originalMaximum = maximum.map(row => [...row]);
const originalAvailable = [...available];


// ==================================================
// 2. NEED MATRIX
// ==================================================

function calculateNeed(alloc = allocation, max = maximum) {
    return max.map((row, i) =>
        row.map((value, j) => value - alloc[i][j])
    );
}


// ==================================================
// 3. RENDER BANKER'S ALGORITHM TABLES
// ==================================================

function createTable(data, elementId, editableName = null) {
    const container = document.getElementById(elementId);
    if (!container) return;

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Process</th>
                    ${resourceNames.map(name => `<th>${name}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
    `;

    data.forEach((row, i) => {
        html += `
            <tr>
                <td>P${i}</td>
                ${row.map((value, j) => editableName
                    ? `<td><input class="matrix-input" type="number" min="0" step="1"
                              value="${value}" data-matrix="${editableName}"
                              data-row="${i}" data-col="${j}"
                              aria-label="${editableName} P${i} ${resourceNames[j]}"></td>`
                    : `<td>${value}</td>`).join("")}
            </tr>
        `;
    });

    html += "</tbody></table>";
    container.innerHTML = html;
}

function renderAvailable() {
    const container = document.getElementById("available");
    if (!container) return;

    container.innerHTML = `
        <div class="mini-matrix plain">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Vector</th>
                            ${resourceNames.map(name => `<th>${name}</th>`).join("")}
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Available</td>
                            ${available.map((value, j) => `
                                <td>
                                    <input class="matrix-input" type="number" min="0" step="1"
                                           value="${value}" data-index="${j}"
                                           aria-label="Available ${resourceNames[j]}">
                                </td>`).join("")}
                        </tr>
                    </tbody>
                </table>
            </div>
            <p class="matrix-note">Editable: change a value, then click Run Safety Check.</p>
        </div>`;
}

function renderAll() {
    document.getElementById("processCount").textContent = allocation.length;
    document.getElementById("resourceCount").textContent = resourceNames.length;

    createTable(allocation, "allocationTable", "allocation");
    createTable(maximum, "maximumTable", "maximum");
    createTable(calculateNeed(), "needTable");
    renderAvailable();
}



// ==================================================
// 3B. GENERIC MATRIX / TRACE RENDER HELPERS
// ==================================================

// Renders any 2-D array as a labelled matrix table.
function matrixHTML(title, rows, opts = {}) {
    const cols = opts.cols || resourceNames;
    const rowLabels = opts.rowLabels || rows.map((_, i) => `P${i}`);
    const corner = opts.corner || "Process";
    const highlight = opts.highlightRows || [];
    const cellClass = opts.cellClass || (() => "");
    const note = opts.note ? `<p class="matrix-note">${opts.note}</p>` : "";
    const heading = title ? `<h4>${title}</h4>` : "";

    return `
        <div class="mini-matrix ${opts.className || ""}">
            ${heading}${note}
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr><th>${corner}</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
                    </thead>
                    <tbody>
                        ${rows.map((row, i) => `
                            <tr class="${highlight.includes(i) ? "row-highlight" : ""}">
                                <td>${rowLabels[i]}</td>
                                ${row.map((v, j) => `<td class="${cellClass(v, i, j)}">${v}</td>`).join("")}
                            </tr>`).join("")}
                    </tbody>
                </table>
            </div>
        </div>`;
}

// Allocation + Maximum + Need + Available for any state.
function stateMatricesHTML(alloc, max, avail, opts = {}) {
    const prefix = opts.prefix || "";
    const hl = opts.highlightRows || [];
    return `
        <div class="matrix-row">
            ${matrixHTML(prefix + "Allocation", alloc, { highlightRows: hl })}
            ${matrixHTML(prefix + "Maximum", max, { highlightRows: hl })}
            ${matrixHTML(prefix + "Need (Max − Allocation)", calculateNeed(alloc, max), { highlightRows: hl })}
            ${matrixHTML(prefix + "Available", [avail], { rowLabels: ["Available"], corner: "Vector" })}
        </div>`;
}

// Step-by-step table of the safety algorithm: Work (= Available) matrix after every step.
function safetyTraceHTML(result, startWork, needs, title = "Safety algorithm: Work / Available matrix after each step") {
    const n = startWork.length;
    const labels = n === resourceNames.length ? resourceNames : startWork.map((_, i) => `R${i + 1}`);
    const head = labels.map(l => `<th>${l}</th>`).join("");
    const cells = arr => arr.map(v => `<td>${v}</td>`).join("");
    const dash = Array(n).fill("–");

    let body = `
        <tr class="row-start">
            <td>0</td><td>Start</td>${cells(dash)}${cells(dash)}${cells(startWork)}
        </tr>`;

    result.steps.forEach((s, i) => {
        body += `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${s.process}</strong> finishes</td>
            ${cells(s.need)}${cells(s.workBefore)}${cells(s.workAfter)}
        </tr>`;
    });

    let footer = "";
    if (!result.safe) {
        const stuckRows = result.unfinished.map(p => needs[Number(p.slice(1))]);
        footer = `
            <p class="matrix-note trace-fail">No further process has Need ≤ Work. Stuck at Work = (${result.finalWork.join(", ")}).
            Unfinished: ${result.unfinished.join(", ")}.</p>
            ${matrixHTML("Need of unfinished processes", stuckRows, { rowLabels: result.unfinished })}`;
    } else {
        footer = `<p class="matrix-note trace-ok">All processes finished. Safe sequence: ${result.sequence.join(" → ")}.</p>`;
    }

    return `
        <div class="mini-matrix trace">
            <h4>${title}</h4>
            <div class="table-wrap">
                <table class="trace-table">
                    <thead>
                        <tr>
                            <th rowspan="2">Step</th><th rowspan="2">Process</th>
                            <th colspan="${n}">Need</th>
                            <th colspan="${n}">Work before</th>
                            <th colspan="${n}">Work after (+ Allocation)</th>
                        </tr>
                        <tr>${head}${head}${head}</tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
            ${footer}
        </div>`;
}

// ==================================================
// 4. BANKER'S SAFETY ALGORITHM
// ==================================================

function checkSafety(alloc = allocation, max = maximum, avail = available) {
    const work = [...avail];
    const finished = Array(alloc.length).fill(false);
    const sequence = [];
    const steps = [];
    const needs = calculateNeed(alloc, max);

    while (sequence.length < alloc.length) {
        let found = false;

        for (let i = 0; i < alloc.length; i++) {
            if (finished[i]) continue;

            const canFinish = needs[i].every((required, j) => required <= work[j]);

            if (canFinish) {
                const workBefore = [...work];

                for (let j = 0; j < work.length; j++) {
                    work[j] += alloc[i][j];
                }

                steps.push({
                    process: `P${i}`,
                    need: [...needs[i]],
                    workBefore,
                    workAfter: [...work]
                });

                finished[i] = true;
                sequence.push(`P${i}`);
                found = true;
                break;
            }
        }

        if (!found) break;
    }

    return {
        safe: sequence.length === alloc.length,
        sequence,
        steps,
        unfinished: finished
            .map((done, i) => done ? null : `P${i}`)
            .filter(Boolean),
        finalWork: work
    };
}


// ==================================================
// 5. STATUS AND RESULT MESSAGES
// ==================================================

function showResult(elementId, message, className = "neutral") {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.className = `result ${className}`;
    element.textContent = message;
}

function updateStatus(label, className, description) {
    const status = document.getElementById("status");
    if (!status) return;

    status.textContent = label;
    status.className = className;
    document.getElementById("statusDescription").textContent = description;
}

function runSafetyCheck() {
    const result = checkSafety();
    const steps = document.getElementById("safetySteps");
    if (steps) {
        steps.innerHTML = safetyTraceHTML(result, available, calculateNeed());
    }

    if (result.safe) {
        updateStatus("Safe", "status-safe", "A complete safe sequence exists");
        showResult(
            "result",
            `SAFE STATE. Safe sequence: ${result.sequence.join(" → ")}. ` +
            `Final Work vector: (${result.finalWork.join(", ")}).`,
            "safe"
        );
    } else {
        updateStatus("Unsafe", "status-unsafe", "No complete safe sequence exists");
        showResult(
            "result",
            `UNSAFE STATE. No complete safe sequence was found. ` +
            `Unfinished processes: ${result.unfinished.join(", ")}. ` +
            "An unsafe state alone does not prove deadlock.",
            "unsafe"
        );
    }
}


// ==================================================
// 6. RESOURCE REQUEST MANAGER
// ==================================================

function showRequestMatrices(p, request, title, trial) {
    const box = document.getElementById("requestMatrices");
    if (!box) return;

    const comparison = matrixHTML("Request check for P" + p, [
        request,
        calculateNeed()[p],
        [...available]
    ], {
        rowLabels: [`Request (P${p})`, `Need (P${p})`, "Available"],
        corner: "Vector"
    });

    let html = `<h4 class="steps-title">${title}</h4>${comparison}`;

    if (trial) {
        html += stateMatricesHTML(trial.alloc, maximum, trial.avail, {
            prefix: "After request: ",
            highlightRows: [p]
        });
        html += safetyTraceHTML(trial.result, trial.avail, calculateNeed(trial.alloc, maximum),
            "Safety check on the trial state: Work / Available matrix after each step");
    } else {
        html += stateMatricesHTML(allocation, maximum, available, {
            prefix: "Current: ",
            highlightRows: [p]
        });
    }

    box.innerHTML = html;
}

function evaluateRequest() {
    const p = Number(document.getElementById("processId").value);
    const ids = ["requestA", "requestB", "requestC"];
    const raw = ids.map(id => document.getElementById(id).value);

    if (!Number.isInteger(p) || p < 0 || p >= allocation.length) {
        showResult("requestResult", "INVALID INPUT: Select a valid process.", "invalid");
        return;
    }

    if (raw.some(value => value.trim() === "")) {
        showResult("requestResult", "INVALID INPUT: Enter all resource quantities.", "invalid");
        return;
    }

    const request = raw.map(Number);

    if (request.some(value => !Number.isSafeInteger(value) || value < 0)) {
        showResult(
            "requestResult",
            "INVALID REQUEST: Use non-negative integer quantities.",
            "invalid"
        );
        document.getElementById("requestMatrices").innerHTML = "";
        return;
    }

    const need = calculateNeed()[p];

    if (request.some((value, j) => value > need[j])) {
        showResult(
            "requestResult",
            `DENIED: Request (${request.join(", ")}) exceeds Need ` +
            `(${need.join(", ")}) for P${p}. State unchanged.`,
            "invalid"
        );
        showRequestMatrices(p, request, "Request denied: exceeds Need. State unchanged (matrices below).");
        return;
    }

    if (request.some((value, j) => value > available[j])) {
        showResult(
            "requestResult",
            `WAIT: Request (${request.join(", ")}) exceeds Available ` +
            `(${available.join(", ")}). No resources were allocated.`,
            "wait"
        );
        showRequestMatrices(p, request, "Request must wait: exceeds Available. State unchanged (matrices below).");
        return;
    }

    const trialAllocation = allocation.map(row => [...row]);
    const trialAvailable = [...available];

    for (let j = 0; j < request.length; j++) {
        trialAllocation[p][j] += request[j];
        trialAvailable[j] -= request[j];
    }

    const trial = checkSafety(trialAllocation, maximum, trialAvailable);

    if (!trial.safe) {
        showResult(
            "requestResult",
            "DENIED: This request would make the system unsafe. " +
            "The original state is unchanged.",
            "unsafe"
        );
        showRequestMatrices(p, request, "Request denied: trial state is unsafe. Matrices below show the trial state, not the live state.", {
            alloc: trialAllocation,
            avail: trialAvailable,
            result: trial
        });
        return;
    }

    for (let j = 0; j < request.length; j++) {
        allocation[p][j] += request[j];
        available[j] -= request[j];
    }

    renderAll();
    {
        const box = document.getElementById("requestMatrices");
        box.innerHTML = `<h4 class="steps-title">Request granted: matrices after allocation</h4>` +
            matrixHTML("Request given to P" + p, [request], { rowLabels: [`P${p} request`], corner: "Vector" }) +
            stateMatricesHTML(allocation, maximum, available, { prefix: "Updated: ", highlightRows: [p] }) +
            safetyTraceHTML(trial, available, calculateNeed(),
                "Safety check after granting: Work / Available matrix after each step");
    }
    updateStatus("Safe", "status-safe", "Request granted after safety verification");
    showResult(
        "requestResult",
        `GRANTED to P${p}. Safe sequence: ${trial.sequence.join(" → ")}. ` +
        `Updated Available: (${available.join(", ")}).`,
        "safe"
    );
}

function resetOriginalState() {
    for (let i = 0; i < allocation.length; i++) {
        for (let j = 0; j < resourceNames.length; j++) {
            allocation[i][j] = originalAllocation[i][j];
            maximum[i][j] = originalMaximum[i][j];
        }
    }

    for (let j = 0; j < available.length; j++) {
        available[j] = originalAvailable[j];
    }

    renderAll();
    updateStatus("Not Checked", "status-neutral", "Run a safety check");
    showResult("result", "Click Run Safety Check to analyze the current state.", "neutral");
    showResult("requestResult", "Original resource state restored.", "neutral");
    document.getElementById("safetySteps").innerHTML = "";
    document.getElementById("requestMatrices").innerHTML = "";
}


// ==================================================
// 7. SEPARATE DEADLOCK DETECTION SCENARIO
// ==================================================

function createInitialDeadlockState() {
    return {
        processes: {
            P0: { active: true, status: "Waiting for R2" },
            P1: { active: true, status: "Waiting for R1" }
        },
        resources: {
            R1: { holder: "P0", waitingProcess: "P1" },
            R2: { holder: "P1", waitingProcess: "P0" }
        },
        recoveryPerformed: false
    };
}

let deadlockState = createInitialDeadlockState();

function renderDeadlockState() {
    const resources = deadlockState.resources;
    const processes = deadlockState.processes;
    const container = document.getElementById("deadlockState");
    if (!container) return;

    const rows = [
        { name: "R1", ...resources.R1 },
        { name: "R2", ...resources.R2 }
    ];

    let html = `
        <table>
            <thead>
                <tr>
                    <th>Resource</th>
                    <th>Current Holder</th>
                    <th>Waiting Process</th>
                </tr>
            </thead>
            <tbody>
    `;

    rows.forEach(row => {
        html += `
            <tr>
                <td>${row.name}</td>
                <td>${row.holder ?? "Available"}</td>
                <td>${row.waitingProcess ?? "None"}</td>
            </tr>
        `;
    });

    html += "</tbody></table>";
    html += `
        <p class="graph-caption">
            P0: ${processes.P0.status} | P1: ${processes.P1.status}
        </p>
    `;
    container.innerHTML = html;
}

function buildWaitForGraph() {
    const edges = [];
    const processes = deadlockState.processes;

    for (const [resourceName, resource] of Object.entries(deadlockState.resources)) {
        const waiter = resource.waitingProcess;
        const holder = resource.holder;

        if (
            waiter &&
            holder &&
            processes[waiter]?.active &&
            processes[holder]?.active
        ) {
            edges.push({ from: waiter, to: holder, resource: resourceName });
        }
    }

    return edges;
}

function findDeadlockCycle() {
    const edges = buildWaitForGraph();
    const graph = {};

    for (const process of Object.keys(deadlockState.processes)) {
        graph[process] = [];
    }

    edges.forEach(edge => graph[edge.from].push(edge.to));

    const visited = new Set();
    const activePath = [];
    const inPath = new Set();

    function visit(process) {
        if (inPath.has(process)) {
            const start = activePath.indexOf(process);
            return activePath.slice(start).concat(process);
        }

        if (visited.has(process)) return null;

        visited.add(process);
        activePath.push(process);
        inPath.add(process);

        for (const next of graph[process] || []) {
            const cycle = visit(next);
            if (cycle) return cycle;
        }

        activePath.pop();
        inPath.delete(process);
        return null;
    }

    for (const process of Object.keys(graph)) {
        const cycle = visit(process);
        if (cycle) return { cycle, edges };
    }

    return { cycle: null, edges };
}

function renderWaitForGraph(detection = findDeadlockCycle()) {
    const container = document.getElementById("waitForGraph");
    if (!container) return;

    if (detection.cycle) {
        container.innerHTML = `
            <div class="graph-nodes">
                <div class="graph-node active">P0</div>
                <span class="graph-arrow">→</span>
                <div class="graph-node active">P1</div>
                <span class="graph-arrow">→</span>
                <div class="graph-node active">P0</div>
            </div>
            <p class="graph-caption">
                Cycle: ${detection.cycle.join(" → ")}.
                P0 waits for a resource held by P1, and P1 waits for a
                resource held by P0.
            </p>
        `;
    } else {
        container.innerHTML = `
            <div class="graph-nodes">
                <div class="graph-node">P0</div>
                <span class="graph-arrow">↔</span>
                <div class="graph-node">P1</div>
            </div>
            <p class="graph-caption">No active wait-for cycle remains.</p>
        `;
    }
}

function detectDeadlock() {
    const detection = findDeadlockCycle();
    renderDeadlockState();
    renderWaitForGraph(detection);

    if (detection.cycle) {
        showResult(
            "deadlockResult",
            `CONFIRMED DEADLOCK: ${detection.cycle.join(" → ")}. ` +
            "Both resources have one instance, and both processes are " +
            "blocked waiting for resources held by one another.",
            "unsafe"
        );
    } else {
        showResult(
            "deadlockResult",
            "NO DEADLOCK CYCLE DETECTED in the current scenario.",
            "safe"
        );
    }
}

function recoverDeadlock() {
    if (deadlockState.recoveryPerformed) {
        showResult(
            "deadlockResult",
            "Recovery has already been performed. Reset the scenario to retry.",
            "neutral"
        );
        return;
    }

    const detection = findDeadlockCycle();

    if (!detection.cycle) {
        showResult(
            "deadlockResult",
            "Recovery not required because no deadlock cycle exists.",
            "neutral"
        );
        return;
    }

    // Terminate P0 and release R1.
    deadlockState.processes.P0.active = false;
    deadlockState.processes.P0.status = "Terminated";
    deadlockState.resources.R1.holder = null;

    if (deadlockState.resources.R2.waitingProcess === "P0") {
        deadlockState.resources.R2.waitingProcess = null;
    }

    // P1 obtains R1 and finishes, releasing both resources.
    deadlockState.resources.R1.holder = "P1";
    deadlockState.resources.R1.waitingProcess = null;
    deadlockState.processes.P1.status = "Completed";

    deadlockState.resources.R1.holder = null;
    deadlockState.resources.R2.holder = null;
    deadlockState.resources.R2.waitingProcess = null;
    deadlockState.recoveryPerformed = true;

    renderDeadlockState();
    renderWaitForGraph();

    showResult(
        "deadlockResult",
        "RECOVERY SUCCESSFUL. P0 was terminated and released R1. " +
        "P1 acquired R1, completed and released both resources. " +
        "Both resources are available and no wait-for cycle remains.",
        "safe"
    );
}

function resetDeadlockScenario() {
    deadlockState = createInitialDeadlockState();
    renderDeadlockState();
    renderWaitForGraph();
    showResult(
        "deadlockResult",
        "Scenario reset. P0 holds R1 and waits for R2; P1 holds R2 and waits for R1.",
        "neutral"
    );
}


// ==================================================
// 8. DEADLOCK PREVENTION: FIXED RESOURCE ORDER
// ==================================================

// Policy: acquire R1 before R2. A process holding R2 cannot request R1.
function checkResourceOrder(held, requested) {
    const rank = { R1: 1, R2: 2 };

    if (requested === held && held !== "none") {
        return {
            allowed: false,
            message: `INVALID REQUEST: The process already holds ${held}.`
        };
    }

    if (held === "R2" && requested === "R1") {
        return {
            allowed: false,
            message:
                "REJECTED BY PREVENTION POLICY: A process holding R2 " +
                "cannot request R1. The fixed order is R1 before R2. " +
                "Release R2 before restarting with the correct order."
        };
    }

    if (
        held !== "none" &&
        rank[requested] <= rank[held]
    ) {
        return {
            allowed: false,
            message: "REJECTED: The request violates the fixed resource order."
        };
    }

    if (!Object.hasOwn(rank, requested)) {
        return {
            allowed: false,
            message: "INVALID REQUEST: Select a known resource."
        };
    }

    return {
        allowed: true,
        message:
            `ALLOWED BY ORDERING POLICY: Requesting ${requested} while ` +
            `${held === "none" ? "holding no resource" : "holding " + held} ` +
            "does not violate the R1 → R2 ordering rule. This checks " +
            "the ordering policy only, not actual resource availability."
    };
}

function evaluatePreventionPolicy() {
    const process = document.getElementById("preventionProcess").value;
    const held = document.getElementById("heldResource").value;
    const requested = document.getElementById("requestedResource").value;
    const result = checkResourceOrder(held, requested);

    showResult(
        "policyResult",
        `${process}: ${result.message}`,
        result.allowed ? "safe" : "invalid"
    );
}

function resetPreventionPolicy() {
    document.getElementById("preventionProcess").value = "P0";
    document.getElementById("heldResource").value = "none";
    document.getElementById("requestedResource").value = "R1";
    showResult(
        "policyResult",
        "Policy example reset. Choose a process, held resource and requested resource.",
        "neutral"
    );
}


// ==================================================
// 9. AUTOMATED TEST CASE RUNNER (TC1–TC6, each runnable separately)
// ==================================================

const clone2D = m => m.map(row => [...row]);

function isValidSafeSequence(sequence, alloc, max, avail) {
    if (!Array.isArray(sequence) || sequence.length !== alloc.length) return false;

    const work = [...avail];
    const completed = new Set();

    for (const label of sequence) {
        const match = /^P(\d+)$/.exec(label);
        if (!match) return false;

        const idx = Number(match[1]);
        if (idx < 0 || idx >= alloc.length || completed.has(idx)) return false;

        const need = max[idx].map((value, j) => value - alloc[idx][j]);
        if (!need.every((required, j) => required <= work[j])) return false;

        alloc[idx].forEach((value, j) => { work[j] += value; });
        completed.add(idx);
    }

    return completed.size === alloc.length;
}

const testCases = [
    {
        id: "TC1",
        title: "Banker's Algorithm safe state",
        description: "Initial state must have a complete, valid safe sequence.",
        run() {
            const alloc = clone2D(originalAllocation);
            const max = clone2D(originalMaximum);
            const avail = [...originalAvailable];

            const result = checkSafety(clone2D(alloc), max, [...avail]);
            const valid = isValidSafeSequence(result.sequence, clone2D(alloc), max, [...avail]);

            return {
                passed: result.safe && valid,
                details: `Expected: A complete valid safe sequence. Actual: ${
                    result.safe
                        ? `${result.sequence.join(" → ")} (${valid ? "valid" : "invalid"} sequence)`
                        : "Unsafe state"
                }.`,
                views:
                    stateMatricesHTML(alloc, max, avail) +
                    safetyTraceHTML(result, avail, calculateNeed(alloc, max))
            };
        }
    },
    {
        id: "TC2",
        title: "Insufficient available resources (WAIT)",
        description: "P0 requests (4, 0, 0) but only 3 units of A are available.",
        run() {
            const request = [4, 0, 0];
            const need = calculateNeed(originalAllocation, originalMaximum)[0];
            const withinNeed = request.every((v, j) => v <= need[j]);
            const insufficient = request.some((v, j) => v > originalAvailable[j]);

            return {
                passed: withinNeed && insufficient,
                details: `P0 requests (${request.join(", ")}); Available is (${originalAvailable.join(", ")}). ` +
                    `Expected: WAIT. Actual: ${withinNeed && insufficient ? "WAIT condition identified" : "Test conditions not satisfied"}. ` +
                    "Live state unchanged.",
                views:
                    stateMatricesHTML(originalAllocation, originalMaximum, originalAvailable, { highlightRows: [0] }) +
                    matrixHTML("Request check for P0", [request, need, [...originalAvailable]], {
                        rowLabels: ["Request (P0)", "Need (P0)", "Available"],
                        corner: "Vector",
                        cellClass: (v, i, j) =>
                            i === 0 && v > originalAvailable[j] ? "cell-bad" : ""
                    }) +
                    matrixHTML("Available after decision (unchanged, nothing allocated)", [[...originalAvailable]], {
                        rowLabels: ["Available"], corner: "Vector"
                    })
            };
        }
    },
    {
        id: "TC3",
        title: "Request would create an unsafe state",
        description: "P4 requests (3, 3, 0): within Need and Available, but the trial state is unsafe.",
        run() {
            const request = [3, 3, 0];
            const p = 4;
            const need = calculateNeed(originalAllocation, originalMaximum)[p];
            const withinNeed = request.every((v, j) => v <= need[j]);
            const withinAvail = request.every((v, j) => v <= originalAvailable[j]);

            const trialAlloc = clone2D(originalAllocation);
            const trialAvail = [...originalAvailable];

            if (withinNeed && withinAvail) {
                request.forEach((v, j) => {
                    trialAlloc[p][j] += v;
                    trialAvail[j] -= v;
                });
            }

            const safety = checkSafety(clone2D(trialAlloc), originalMaximum, [...trialAvail]);

            return {
                passed: withinNeed && withinAvail && !safety.safe,
                details: `P4 requests (${request.join(", ")}). Within Need: ${withinNeed}. ` +
                    `Within Available: ${withinAvail}. Expected: unsafe trial denied. ` +
                    `Actual: ${!safety.safe ? "Trial state is unsafe" : "Trial state is safe"}. Live state unchanged.`,
                views:
                    stateMatricesHTML(originalAllocation, originalMaximum, originalAvailable, { prefix: "Before: ", highlightRows: [p] }) +
                    matrixHTML("Request check for P4", [request, need, [...originalAvailable]], {
                        rowLabels: ["Request (P4)", "Need (P4)", "Available"], corner: "Vector"
                    }) +
                    stateMatricesHTML(trialAlloc, originalMaximum, trialAvail, { prefix: "Trial after request: ", highlightRows: [p] }) +
                    safetyTraceHTML(safety, trialAvail, calculateNeed(trialAlloc, originalMaximum),
                        "Safety check on trial state: Work / Available matrix after each step")
            };
        }
    },
    {
        id: "TC4",
        title: "Deadlock cycle detection",
        description: "Initial P0/P1 scenario must contain a circular wait.",
        run() {
            const previous = deadlockState;
            deadlockState = createInitialDeadlockState();
            const state = deadlockState;
            const detection = findDeadlockCycle();
            deadlockState = previous;

            const cycleText = detection.cycle ? detection.cycle.join(" → ") : "No cycle";

            // Wait-for adjacency matrix: row waits for column.
            const names = ["P0", "P1"];
            const adjacency = names.map(a =>
                names.map(b => detection.edges.some(e => e.from === a && e.to === b) ? 1 : 0)
            );

            const ownership = Object.entries(state.resources).map(([name, r]) => [
                r.holder ?? "Available", r.waitingProcess ?? "None"
            ]);

            return {
                passed: Boolean(detection.cycle),
                details: `Expected: circular wait involving P0 and P1. Actual: ${cycleText}.`,
                views: `<div class="matrix-row">` +
                    matrixHTML("Resource ownership & waiting", ownership, {
                        cols: ["Current Holder", "Waiting Process"],
                        rowLabels: Object.keys(state.resources),
                        corner: "Resource"
                    }) +
                    matrixHTML("Wait-for matrix (row waits for column; 1 = edge)", adjacency, {
                        cols: names, rowLabels: names, corner: "Waiter",
                        cellClass: v => v === 1 ? "cell-bad" : ""
                    }) +
                    matrixHTML("Wait-for edges", detection.edges.map(e => [e.to, e.resource]), {
                        cols: ["Holder", "Resource"],
                        rowLabels: detection.edges.map(e => e.from),
                        corner: "Waiter"
                    }) +
                    `</div>`
            };
        }
    },
    {
        id: "TC5",
        title: "Deadlock prevention ordering",
        description: "Holding R2 and requesting R1 must be rejected by the R1 → R2 ordering rule.",
        run() {
            const result = checkResourceOrder("R2", "R1");
            const helds = ["none", "R1", "R2"];
            const reqs = ["R1", "R2"];
            const grid = helds.map(h => reqs.map(r => checkResourceOrder(h, r).allowed ? "Allowed" : "Rejected"));

            return {
                passed: result.allowed === false && result.message.includes("REJECTED BY PREVENTION POLICY"),
                details: `Expected: reject R1 request while holding R2. Actual: ${result.allowed ? "Allowed" : "Rejected"}.`,
                views: matrixHTML("Ordering policy matrix (row = held resource, column = requested resource)", grid, {
                    cols: reqs,
                    rowLabels: helds.map(h => h === "none" ? "Holds none" : "Holds " + h),
                    corner: "Held \\ Requested",
                    highlightRows: [2],
                    cellClass: v => v === "Allowed" ? "cell-good" : "cell-bad"
                }) + `<p class="matrix-note">Tested case: holding R2 and requesting R1 → <strong>${result.allowed ? "Allowed" : "Rejected"}</strong>.</p>`
            };
        }
    },
    {
        id: "TC6",
        title: "Boundary and input validation",
        description: "Invalid process, negative request, zero request, and zero remaining Need.",
        run() {
            const invalidProcessRejected = !Number.isInteger(9) || 9 < 0 || 9 >= originalAllocation.length;
            const negativeRequestRejected = [-1, 0, 0].some(v => !Number.isSafeInteger(v) || v < 0);
            const zeroRequestValid = [0, 0, 0].every(v => Number.isSafeInteger(v) && v >= 0);

            const zAlloc = [[1, 0]], zMax = [[1, 0]], zAvail = [0, 0];
            const zero = checkSafety(zAlloc, zMax, zAvail);

            const passed = invalidProcessRejected && negativeRequestRejected && zeroRequestValid && zero.safe;
            const yn = b => b ? "Pass" : "Fail";

            const checks = [
                ["P9 (out of range)", "Rejected", invalidProcessRejected ? "Rejected" : "Accepted", yn(invalidProcessRejected)],
                ["(-1, 0, 0)", "Rejected", negativeRequestRejected ? "Rejected" : "Accepted", yn(negativeRequestRejected)],
                ["(0, 0, 0)", "Valid", zeroRequestValid ? "Valid" : "Invalid", yn(zeroRequestValid)],
                ["Need = (0, 0)", "Can finish", zero.safe ? "Can finish" : "Stuck", yn(zero.safe)]
            ];

            return {
                passed,
                details: `Invalid process rejected by range rule: ${invalidProcessRejected}. ` +
                    `Negative request rejected by quantity rule: ${negativeRequestRejected}. ` +
                    `Zero request passes quantity validation: ${zeroRequestValid}. ` +
                    `Zero remaining Need can finish: ${zero.safe}. ` +
                    "These boundary checks exercise validation rules independently; they do not submit every case through the UI form.",
                views:
                    matrixHTML("Boundary checks", checks, {
                        cols: ["Expected", "Actual", "Result"],
                        rowLabels: checks.map(c => c[0]),
                        corner: "Input",
                        cellClass: v => v === "Pass" ? "cell-good" : v === "Fail" ? "cell-bad" : ""
                    })+
                    `<div class="matrix-row">` +
                    matrixHTML("Zero-Need example: Allocation", zAlloc, { cols: ["R1", "R2"] }) +
                    matrixHTML("Zero-Need example: Maximum", zMax, { cols: ["R1", "R2"] }) +
                    matrixHTML("Zero-Need example: Need", calculateNeed(zAlloc, zMax), { cols: ["R1", "R2"] }) +
                    matrixHTML("Zero-Need example: Available", [zAvail], { cols: ["R1", "R2"], rowLabels: ["Available"], corner: "Vector" }) +
                    `</div>` +
                    safetyTraceHTML(zero, zAvail, calculateNeed(zAlloc, zMax), "Zero-Need example: Work / Available matrix after each step")
            };
        }
    }
];

const testResults = {};

function renderTestCards() {
    const container = document.getElementById("test-results");
    if (!container) return;

    container.innerHTML = testCases.map(tc => `
        <article class="test-case" id="card-${tc.id}">
            <div class="test-case-head">
                <div>
                    <span class="test-id">${tc.id}</span>
                    <h3>${tc.title}</h3>
                    <p class="test-desc">${tc.description}</p>
                </div>
                <div class="test-case-actions">
                    <span class="test-badge" id="badge-${tc.id}">Not run</span>
                    <button class="button button-primary button-small" type="button" data-run="${tc.id}">Run ${tc.id}</button>
                </div>
            </div>
            <div class="test-case-body" id="body-${tc.id}">
                <p class="test-placeholder">Click "Run ${tc.id}" to execute this test case alone.</p>
            </div>
        </article>
    `).join("");
}

function updateTestSummary() {
    const summary = document.getElementById("test-summary");
    if (!summary) return;

    const ran = Object.values(testResults);
    const passed = ran.filter(r => r.passed).length;
    summary.innerHTML = `
        <span>Total: ${testCases.length}</span>
        <span>Run: ${ran.length}</span>
        <span>Passed: ${passed}</span>
        <span>Failed: ${ran.length - passed}</span>
    `;
}

function runSingleTest(id) {
    const tc = testCases.find(t => t.id === id);
    if (!tc) return;

    let outcome;
    try {
        outcome = tc.run();
    } catch (error) {
        outcome = { passed: false, details: `Test threw an error: ${error.message}`, views: "" };
    }

    testResults[id] = outcome;

    const card = document.getElementById(`card-${id}`);
    const badge = document.getElementById(`badge-${id}`);
    const body = document.getElementById(`body-${id}`);

    card.className = `test-case ${outcome.passed ? "pass" : "fail"}`;
    badge.className = `test-badge ${outcome.passed ? "pass" : "fail"}`;
    badge.textContent = outcome.passed ? "PASS" : "FAIL";
    body.innerHTML = `<p class="test-details">${outcome.details}</p>${outcome.views}`;

    updateTestSummary();
}

function runAllTestCases() {
    testCases.forEach(tc => runSingleTest(tc.id));
}

function clearTestResults() {
    Object.keys(testResults).forEach(key => delete testResults[key]);
    renderTestCards();
    updateTestSummary();
}


// ==================================================
// 10. CONNECT BUTTONS AND INITIALIZE
// ==================================================

document.getElementById("checkButton").addEventListener("click", runSafetyCheck);
document.getElementById("requestButton").addEventListener("click", evaluateRequest);
document.getElementById("resetButton").addEventListener("click", resetOriginalState);
document.getElementById("detectDeadlockButton").addEventListener("click", detectDeadlock);
document.getElementById("recoverDeadlockButton").addEventListener("click", recoverDeadlock);
document.getElementById("resetDeadlockButton").addEventListener("click", resetDeadlockScenario);
document.getElementById("checkPolicyButton").addEventListener("click", evaluatePreventionPolicy);
document.getElementById("resetPolicyButton").addEventListener("click", resetPreventionPolicy);
document.getElementById("run-tests-btn").addEventListener("click", runAllTestCases);
document.getElementById("clear-tests-btn").addEventListener("click", clearTestResults);
document.getElementById("test-results").addEventListener("click", event => {
    const button = event.target.closest("[data-run]");
    if (button) runSingleTest(button.dataset.run);
});

renderAll();
renderDeadlockState();
renderWaitForGraph();
renderTestCards();
updateTestSummary();

// Editable Allocation and Maximum matrices (Module 1): Need recalculates live
function handleMatrixEdit(event) {
    const input = event.target.closest(".matrix-input");
    if (!input) return;

    const name = input.dataset.matrix;
    const i = Number(input.dataset.row);
    const j = Number(input.dataset.col);
    const matrix = name === "allocation" ? allocation : maximum;
    const value = Number(input.value);

    if (input.value.trim() === "" || !Number.isSafeInteger(value) || value < 0) {
        input.value = matrix[i][j];
        showResult("result", "INVALID INPUT: Use a non-negative whole number. Previous value restored.", "invalid");
        return;
    }

    const newAllocation = name === "allocation" ? value : allocation[i][j];
    const newMaximum = name === "maximum" ? value : maximum[i][j];

    if (newAllocation > newMaximum) {
        input.value = matrix[i][j];
        showResult(
            "result",
            `INVALID INPUT: Allocation cannot exceed Maximum for P${i}, resource ${resourceNames[j]} (Need would be negative). Previous value restored.`,
            "invalid"
        );
        return;
    }

    matrix[i][j] = value;
    createTable(calculateNeed(), "needTable");

    updateStatus("Not Checked", "status-neutral", "Matrix changed. Run a safety check");
    showResult("result", `${name === "allocation" ? "Allocation" : "Maximum"} of P${i} ${resourceNames[j]} updated to ${value}. Need recalculated. Click Run Safety Check to re-analyze.`, "neutral");
    document.getElementById("safetySteps").innerHTML = "";
}

document.getElementById("allocationTable").addEventListener("change", handleMatrixEdit);
document.getElementById("maximumTable").addEventListener("change", handleMatrixEdit);

// Editable Available matrix (Module 1)
document.getElementById("available").addEventListener("change", event => {
    const input = event.target.closest(".matrix-input");
    if (!input) return;

    const j = Number(input.dataset.index);
    const value = Number(input.value);

    if (input.value.trim() === "" || !Number.isSafeInteger(value) || value < 0) {
        input.value = available[j];
        showResult(
            "result",
            "INVALID INPUT: Available must be a non-negative whole number. Previous value restored.",
            "invalid"
        );
        return;
    }

    available[j] = value;

    updateStatus("Not Checked", "status-neutral", "Available changed. Run a safety check");
    showResult(
        "result",
        `Available updated to (${available.join(", ")}). Click Run Safety Check to re-analyze.`,
        "neutral"
    );
    document.getElementById("safetySteps").innerHTML = "";
});