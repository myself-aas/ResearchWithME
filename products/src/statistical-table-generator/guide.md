# Statistical Table Generator

APA-style tables from a CSV file, computed on your own computer.

ResearchWithMe, version 1.0

## What you get

A small command-line program, `apa_tables.py`, that reads a CSV file and produces tables laid out in APA 7 style, with a draft sentence under each. It needs Python 3.8 or later and nothing else: there is nothing to install, and your data never leaves your machine.

| File | Use |
| --- | --- |
| apa_tables.py | The program |
| statdist.py | Probability functions the program uses; keep it in the same folder |
| sample-data.csv | Made-up data for trying each command |
| Statistical-Table-Generator.pdf | This guide |
| LICENSE.txt | What you may do with these files |

## Analyses

| Command | What it computes |
| --- | --- |
| describe | n, mean, standard deviation, median, minimum, maximum, skewness, kurtosis |
| correlate | Pearson or Spearman correlation matrix with means and standard deviations |
| ttest | Welch's independent-samples t test, or a paired-samples t test, with Cohen's d and a 95% confidence interval |
| anova | One-way ANOVA with eta squared, Levene's test, and Bonferroni-adjusted pairwise comparisons |
| chisq | Chi-square test of independence with Cramer's V and a count of low expected cells |
| regress | Linear regression with B, SE, standardised Beta, t, p, 95% confidence intervals, R squared, and a collinearity warning |

## Editions

| | Free edition | Full edition |
| --- | --- | --- |
| describe, correlate, ttest | Yes | Yes |
| anova, chisq, regress | No | Yes |
| Tables saved as an HTML file for Word | Yes | Yes |
| Size of data file, number of runs | No limit | No limit |

The last line of every result names the edition you have. In the free edition, the three commands of the full edition stop with a message and compute nothing.

## First run

Check that Python is installed by typing `python --version` in a terminal (on some systems the command is `python3`). Then, from the folder that holds these files:

```
python apa_tables.py describe sample-data.csv --vars age study_hours post_score
python apa_tables.py correlate sample-data.csv --vars age study_hours pre_score post_score
python apa_tables.py ttest sample-data.csv --dv post_score --group sex
python apa_tables.py ttest sample-data.csv --paired pre_score post_score
python apa_tables.py anova sample-data.csv --dv post_score --group condition
python apa_tables.py chisq sample-data.csv --row condition --col passed
python apa_tables.py regress sample-data.csv --dv post_score --ivs pre_score study_hours age
```

Add `--out report.html` to any command to save the tables as a file. Open that file in Word (File, Open) and the tables arrive as real Word tables with APA borders; or open it in a browser and copy them.

## Preparing your data

- Save your data as CSV, with column names in the first row and one case per row.
- Column names with spaces work if you put them in quotation marks on the command line.
- Empty cells, NA, N/A, NaN, NULL, and a single full stop are treated as missing.
- Remove names, email addresses, and other identifying columns before you work with the file. The program does not need them, and a habit of working on de-identified files protects your participants.

## How missing data is handled

`describe` uses every available value for each variable. Every other command uses only the cases that are complete on all the variables you named (listwise deletion), and prints the N it used. If that N is much smaller than your sample, find out why before reporting the result.

## What the output contains

- **The table**, numbered and titled, with statistics rounded as APA asks: two decimals for most values, three for p, no leading zero for values that cannot exceed 1.
- **A note** under the table giving N and the meaning of any symbols.
- **A draft sentence.** It is filled in from the numbers in the table by a fixed template. It is a starting point in correct APA notation, written in the variable names from your file. Rewrite it in your own words.
- **Checks.** Where the program can see a reason for caution, it says so: unequal variances, small groups, low expected counts, collinear predictors.
- **A method line** naming exactly what was computed, which you can adapt for your methods section.

## How the numbers are produced

Every number is computed by the program with standard formulas; nothing is estimated by a language model. P values come from the t, F, chi-square, and normal distributions, evaluated with the regularised incomplete beta and gamma functions. When this version was built, its results were compared with SciPy on the sample data and on 16,000 random inputs, and agreed to at least eleven significant figures for the distribution functions and to the printed precision for every table.

## What it does not do

- It does not choose the analysis for you or tell you whether an analysis suits your design.
- It does not test normality or plot anything. Look at your distributions and residuals in whatever you normally use.
- It does not compute Welch's ANOVA, Tukey's HSD, Fisher's exact test, non-parametric tests other than Spearman's correlation, repeated-measures or mixed models, or logistic regression.
- It does not correct correlation tables for multiple comparisons.
- It does not interpret your result. The draft sentence states what the numbers are, not what they mean for your question.

For anything you will publish, check at least one table against the software your field normally uses.

## Problems

| Message | Cause |
| --- | --- |
| Column not found | The name on the command line does not match the header exactly; the message lists the names in the file |
| ... is not a number | A numeric column holds text in some row; the message shows the offending value |
| has 3 groups; a t test needs exactly two | Use `anova` |
| The predictors are perfectly collinear | One predictor is a combination of others; remove one |
| python: command not found | Try `python3`, or install Python from python.org |

## Trademarks

APA and APA Style are trademarks of the American Psychological Association. This product is independent work; it is not affiliated with, endorsed by, or reviewed by the American Psychological Association, and it does not reproduce the Publication Manual.
