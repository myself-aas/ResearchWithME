# The Teardown System

A working method for taking a research repository apart: reading it, running it, and writing down what you found so that someone else can check you.

ResearchWithMe, version 1.0

## What this is, and what it is not

A teardown answers one question about a piece of research software: does the code do what its authors say it does? This guide is the method we use to answer it. It is a procedure with worksheets, not software. It will not run a teardown for you, and it will not make a repository work that does not work.

It is written for engineers and graduate researchers who have to judge code they did not write: before building on it, before citing it, or before reviewing the paper it belongs to. You need to be able to read the language the repository is written in and to use a terminal. You do not need to be an expert in the paper's field, but you must say so in what you write.

The whole method rests on three rules.

1. **Pin what you examined.** A teardown is of one commit, not of "the repository".
2. **Keep what you saw apart from what you were told.** A number you measured and a number the authors reported are different kinds of evidence, and the reader must always be able to tell which is which.
3. **Record what failed and what you did not try.** A teardown that lists only successes cannot be trusted.

## The six stages

| Stage | You produce | Typical share of the time |
| --- | --- | --- |
| 1. Scope | A one-paragraph scope statement and a pinned commit | 5% |
| 2. Read before you run | A map of the repository | 20% |
| 3. Build the claim ledger | A table of claims, each with its source | 15% |
| 4. Reproduce | A run log, and a result for each claim attempted | 35% |
| 5. Read the code against the claims | Findings, each tied to a file and line | 15% |
| 6. Write the record | The teardown itself | 10% |

Set a time budget before you start and write it in the scope statement. A teardown without a budget becomes a second research project. When the budget runs out, stop and report what you reached; "not attempted, out of time" is a legitimate result.

## Stage 1. Scope

Write down four things before you clone anything.

- **The question.** One sentence. "Does the released code reproduce the main result in Table 2?" is a question. "Is this repository good?" is not.
- **The artifact.** The repository URL, and the paper or documentation it belongs to, with its version (arXiv version number, DOI, or date).
- **The commit.** Clone the repository and record the full commit hash, the date of that commit, and the date you cloned it. If the paper names a tag or release, use that one and say so. If it does not, use the latest commit on the default branch and say that the paper does not identify a version.
- **What is out of scope.** Name it. Training from scratch on hardware you do not have, datasets you cannot obtain legally, and claims that need domain expertise you lack all belong here.

Also record your own position: any connection to the authors, to a competing method, or to a funder. If there is none, write "none".

## Stage 2. Read before you run

Do not run anything yet. Code that you run before you read it shapes what you look for afterwards. Read in this order and take notes as you go.

1. **The README, start to finish.** Copy every sentence that promises something ("reproduces", "achieves", "supports", "requires") into your notes. These become ledger entries in Stage 3.
2. **The top-level layout.** List the directories and say in a few words what each holds. Note what is missing that you would expect: tests, a licence, a dependency lock file, configuration for the reported experiments.
3. **The entry points.** Find the commands a user is meant to run. Follow each one file deep: what does it import, what configuration does it read, what does it write?
4. **The dependencies.** Are versions pinned? Is there a lock file, a container definition, or only a list of package names? Unpinned dependencies are the most common reason a repository that worked for its authors does not work for you.
5. **The data path.** Where does data come from, how is it split, and where is the split decided? Write down the file and line.
6. **The evaluation path.** Find the code that computes the reported metric. Write down the file and line.
7. **The history.** Read the commit log around the paper's date. Look for large changes after publication, and for results files committed directly.
8. **The licence and the data terms.** Record them. You will need them if you publish anything derived from the code.

The output of this stage is a map: one page that says where things are. If you cannot draw the map, you are not ready to run the code.

## Stage 3. Build the claim ledger

The ledger is the centre of the method. It is a table with one row per claim, and it is filled in before you reproduce anything, so that the claims are the authors' and not ones you chose after seeing results.

Take claims from the paper's abstract, its results tables, and the README. For each, record:

| Column | What goes in it |
| --- | --- |
| ID | C1, C2, ... |
| Claim | The authors' words, quoted, with the number if there is one |
| Source | Where the claim is made: paper section, table, figure, or README line |
| Kind | Result (a number), capability (it can do X), or property (it is deterministic, it scales) |
| What would test it | The command or inspection that could confirm or contradict it |
| Attempted? | Yes, no, or partly; if no, why not |
| Outcome | Filled in later: see Stage 4 |
| Evidence | Filled in later: the log file, the output, or the file and line |

Keep it short. Six to twelve claims is usual. Rank them: the claim the paper's conclusion depends on comes first, and it is the one to spend the budget on.

A claim you cannot think of a test for is worth noting as such. It tells the reader the claim is not checkable from the released material.

## Stage 4. Reproduce

Now run things, in this order.

1. **Record the environment first.** Operating system, hardware (CPU, memory, GPU model if any), language version, and the exact versions of installed dependencies as resolved on your machine. Save this as a file. If the repository provides a container or a lock file, use it and say so; if you had to deviate from it, say how.
2. **Install, and write down everything that did not work.** Each fix you had to make to get the code running is a finding. Record the error, the fix, and how long it took.
3. **Run the smallest thing first.** Tests if there are any, then the quickest example. This tells you the installation works before you spend hours on a full run.
4. **Then go down the ledger from the top.** For each claim, run the command you wrote in "what would test it". Save the full output. Record the command exactly as typed, the random seed if one is set, and the wall-clock time.
5. **Classify each outcome** using only these five words, and use them the same way every time.

| Outcome | Meaning |
| --- | --- |
| Reproduced | You ran it and got the reported result, within a tolerance you state |
| Partly reproduced | You got the direction or the rough size, but not the reported number; give both |
| Not reproduced | You ran it as documented and got a materially different result; give both |
| Could not run | It failed before producing a result; give the error and what you tried |
| Not attempted | You did not try; give the reason (hardware, data access, time, out of scope) |

State your tolerance before you look at the result. For stochastic methods, one run is one sample: say how many runs you did, and if it was one, say that a single run cannot distinguish a failed reproduction from ordinary variance.

Never change the code to make a result match without recording the change as a finding. If you altered anything (a path, a batch size, a deprecated call), keep a diff and include it.

## Stage 5. Read the code against the claims

Reproducing a number shows the code produces that number. It does not show the number means what the paper says. For each claim near the top of the ledger, trace it through the code and look for the following. Every finding must cite a file and line at the pinned commit.

- **Paper and code disagree.** A hyperparameter, a loss term, a preprocessing step, or an architecture detail in the code that differs from the description in the paper.
- **Defaults that are not the reported settings.** The command in the README runs, but with defaults that are not the configuration used for the paper's table.
- **Leakage.** Test data touched during training or model selection: normalisation statistics computed on the full dataset, early stopping on the test split, hyperparameters tuned on test results.
- **Evaluation differences.** The metric is computed differently from the baseline it is compared with: a different split, different preprocessing, a different averaging, or a filtered subset.
- **Unseeded randomness.** Results depend on a seed that is not set or not recorded.
- **Results that are stored, not computed.** Numbers read from a committed file that the code never regenerates.
- **Silent failure.** Broad exception handlers, fallbacks that swap in default values, or skipped samples that are not counted.

Record what you looked for and did not find as well. "We checked how the split is made (data/split.py, lines 40 to 71) and found no overlap between train and test identifiers" is a finding, and a useful one.

Use plain, limited language. Say "the code at this line does X, and the paper says Y". Do not say why you think the authors did it, and do not use words that imply intent.

## Stage 6. Write the record

The record is written so that a reader can verify it without trusting you. Use this structure.

1. **Summary.** Three or four sentences: what was examined, what was reproduced, what was not, and the most important finding. Write it last.
2. **What was examined.** Repository URL, commit hash, paper version, dates, your environment, your time budget, and your declared connections.
3. **The claim ledger**, complete, including the rows marked "not attempted".
4. **What we ran.** Commands, in order, with outcomes. Link or attach logs.
5. **What we found in the code.** Each finding with file, line, and a short quotation of the code.
6. **What we did not test, and why.** This section is not optional.
7. **Limits of this teardown.** What a reader should not conclude from it. A teardown of one commit on one machine is evidence, not a verdict.
8. **How to check us.** The exact steps for a reader to repeat what you did.

Three writing rules carry most of the weight.

- **Mark every statement as observed or reported.** "We measured 71.3" and "the authors report 74.8" are both fine. "The accuracy is 74.8" is not, because the reader cannot tell which it is.
- **Give negative results the same space as positive ones.** If the main claim reproduced and a secondary one did not, both appear in the summary.
- **Quote, with a locator.** Every claim you attribute to the authors carries the place they made it. Every claim you make about the code carries a file and line.

## Before you publish

- **Tell the authors.** Send them the draft, or at least the findings, and give them a stated period to reply; two weeks is common. Many apparent failures are an undocumented step that the authors can supply in one message. Record that you contacted them, on what date, and what they said, or that they did not reply.
- **Check your own work.** Have someone else follow your "how to check us" section from a clean machine. If they cannot, your teardown has the fault you are looking for in others.
- **Commit to corrections.** Say how a reader or author can report an error in the teardown, and date any correction you make.

## What goes wrong most often

- The repository changed after the paper. Pin the commit, and say which commit you believe the paper used and why.
- You fixed the installation and forgot what you changed. Keep a running log from the first command.
- You reproduced the number and stopped. Stage 5 is where most substantive findings come from.
- You could not reproduce it and wrote that the result is wrong. All you know is that you could not reproduce it, on your machine, in your time budget. Say exactly that.
- You wrote a verdict. A teardown reports; the reader decides.

## The files in this download

| File | Use |
| --- | --- |
| The-Teardown-System.pdf | This guide |
| teardown-record-template.md | The Stage 6 structure, ready to fill in |
| claim-ledger.xlsx and claim-ledger.csv | The Stage 3 table, with the outcome words as a fixed list |
| run-log-template.md | The Stage 4 log: environment, commands, outcomes |
| reading-checklist.pdf | Stages 2 and 5 as a one-page checklist |
| LICENSE.txt | What you may do with these files |
