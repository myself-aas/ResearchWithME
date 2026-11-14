# Statistical Table Generator

APA-style tables and publication figures from a CSV file, computed on your own computer.

ResearchWithMe, version 1.0

## What you get

A small command-line program, `apa_tables.py`, that reads a CSV file and produces tables laid out in APA 7 style, with a draft sentence under each. It needs Python 3.8 or later and nothing else: there is nothing to install, and your data never leaves your machine.

| File | Use |
| --- | --- |
| apa_tables.py | The program |
| apa_more.py, figures.py | Full edition only: the further analyses and the figures; keep them in the same folder |
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

The full edition adds these:

| Command | What it computes |
| --- | --- |
| onesample | One-sample t test against a value you give, with Cohen's d and a 95% confidence interval |
| welchanova | Welch's one-way ANOVA (equal variances not assumed) with Holm-adjusted pairwise Welch's t tests |
| factorial | Two-way between-groups ANOVA with Type III sums of squares and partial eta squared; with `--covariates` it is an ANCOVA |
| rmanova | One-way repeated-measures ANOVA with the Greenhouse-Geisser correction |
| mannwhitney | Mann-Whitney U test with the rank-biserial correlation |
| wilcoxon | Wilcoxon signed-rank test with the matched-pairs rank-biserial correlation |
| kruskal | Kruskal-Wallis test with epsilon squared and Holm-adjusted pairwise Mann-Whitney tests |
| friedman | Friedman test with Kendall's W |
| fisher | Fisher's exact test for a 2 by 2 table, with the odds ratio and its 95% confidence interval |
| mcnemar | McNemar's exact test for paired proportions |
| gof | Chi-square goodness-of-fit test, against equal or supplied proportions |
| logistic | Binary logistic regression with odds ratios, 95% confidence intervals, a likelihood-ratio test, and McFadden and Nagelkerke R squared |
| reliability | Cronbach's alpha, item-rest correlations, and alpha if an item is deleted |
| normality | Shapiro-Wilk test with skewness and kurtosis |
| plot | One figure with no test: histogram, Q-Q plot, box plot, means plot, or scatter plot |

That is 21 commands. It is the set most theses and articles in the social, health, and education sciences report; it is not every analysis there is. The section "What it does not do" lists what is left out.

## Figures (full edition)

Add `--fig NAME` to a command and the program saves the figures that go with it:

| Command | Figures |
| --- | --- |
| describe, normality | Histogram with the normal curve, and a normal Q-Q plot, for each variable |
| correlate | Shaded correlation matrix; with two variables, also a scatter plot |
| ttest, anova, welchanova, mannwhitney, kruskal | Means with 95% confidence intervals, and box plots |
| ttest --paired, wilcoxon, rmanova, friedman | Means with 95% confidence intervals across the measures, and box plots |
| factorial | Interaction plot of the cell means |
| chisq, fisher | Grouped bar chart of the counts |
| regress | Residuals against fitted values, a Q-Q plot of the residuals, and with one predictor a scatter plot with the fitted line |

Each figure is saved three times:

| File | What it is | Use it for |
| --- | --- | --- |
| `.png` | An image at 300 dpi, or at the resolution you give with `--dpi` (72 to 1200) | Journals and forms that ask for an image file; Word; slides |
| `.svg` | A vector file | Word and PowerPoint (Insert, Pictures), and editing in Inkscape or Illustrator |
| `.pdf` | A vector file | LaTeX, and journals that accept vector figures |

For example, `--fig figure1 --dpi 600` writes 600 dpi images, 3900 by 2700 pixels. The resolution is recorded inside the PNG, so Word and journal systems place it at 6.5 by 4.5 inches. Journals commonly ask for 300 dpi for shaded figures and 600 to 1200 dpi for line art; check your journal's instructions. The vector files store lines and text, not pixels, and stay sharp at any size, so prefer them where they are accepted.

The PNG is greyscale and has no transparency. Its lettering is a plain single-stroke face (Hershey Simplex), because Python comes with no fonts; the SVG and PDF use Helvetica or Arial. If the lettering must match your journal's typeface, use the SVG or PDF. The program does not write TIFF, EPS, or JPEG files; any image editor converts the PNG.

The figures are 6.5 by 4.5 inches, in black and grey, with a sans-serif face, axes on the left and bottom, and no title inside the figure, because the caption belongs in your manuscript. Box plots follow Tukey: the box runs from the first to the third quartile, the line is the median, the whiskers reach the most extreme value within 1.5 times the interquartile range, and values beyond that are drawn as points. Error bars are 95% confidence intervals of each mean, computed separately for each group or measure. The program does not offer colours, themes, or other layouts; an SVG can be edited in Inkscape or Illustrator.

## Editions

| | Free edition | Full edition |
| --- | --- | --- |
| describe, correlate, ttest | Yes | Yes |
| anova, chisq, regress | No | Yes |
| The 15 further commands listed above | No | Yes |
| Figures (`--fig`) | No | Yes |
| Tables saved as an HTML file for Word | Yes | Yes |
| Size of data file, number of runs | No limit | No limit |

The last line of every result names the edition you have. In the free edition, the commands of the full edition and the `--fig` option stop with a message and compute nothing.

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

The full edition's commands, on the same sample file:

```
python apa_tables.py onesample sample-data.csv --var post_score --mu 60
python apa_tables.py welchanova sample-data.csv --dv post_score --group condition
python apa_tables.py factorial sample-data.csv --dv post_score --factors condition sex
python apa_tables.py factorial sample-data.csv --dv post_score --factors condition sex --covariates pre_score
python apa_tables.py rmanova sample-data.csv --vars pre_score post_score followup_score
python apa_tables.py mannwhitney sample-data.csv --dv post_score --group sex
python apa_tables.py wilcoxon sample-data.csv --paired pre_score post_score
python apa_tables.py kruskal sample-data.csv --dv post_score --group condition
python apa_tables.py friedman sample-data.csv --vars pre_score post_score followup_score
python apa_tables.py fisher sample-data.csv --row sex --col passed
python apa_tables.py mcnemar sample-data.csv --paired passed_pre passed
python apa_tables.py gof sample-data.csv --var condition
python apa_tables.py logistic sample-data.csv --dv passed --ivs study_hours age
python apa_tables.py reliability sample-data.csv --vars q1 q2 q3 q4
python apa_tables.py normality sample-data.csv --vars post_score
python apa_tables.py anova sample-data.csv --dv post_score --group condition --fig figure1
python apa_tables.py plot sample-data.csv --kind scatter --x pre_score --y post_score --line --fig figure2
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

The full edition's further analyses were compared on the sample file with SciPy 1.17.1 and statsmodels 0.15.0: the test statistics and p values agreed to the decimals shown in the tables. The Mann-Whitney and Wilcoxon tests give exact p values when there are no ties and the sample is small (either group of 8 or fewer; up to 50 pairs), and otherwise use the normal approximation with tie and continuity corrections; the note under the table says which. Two-way ANOVA uses Type III sums of squares, the default of SPSS; R's `anova()` defaults to Type I and will differ when cell sizes are unequal.

## What it does not do

- It does not choose the analysis for you or tell you whether an analysis suits your design.
- The free edition does not test normality or plot anything. The full edition does both, but it does not judge the result for you: look at the Q-Q plot and the residual plot yourself.
- Neither edition computes Tukey's HSD or other studentised-range comparisons (pairwise comparisons use the Bonferroni or Holm adjustment), mixed or three-way designs, MANOVA, multilevel models, factor analysis, structural equation models, survival analysis, ordinal or multinomial regression, mediation or moderation routines, power analysis, or Bayesian statistics. Use R, JASP, jamovi, or SPSS for those.
- Fisher's exact test covers 2 by 2 tables only. Its odds ratio is the sample cross-product ratio, which differs slightly from the conditional estimate R reports.
- The Shapiro-Wilk p value uses Royston's approximation, as R and SciPy do, and agrees with them to about three decimals rather than exactly.
- The reliability command does not reverse-score items.
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

## Acknowledgement

The lettering in the PNG figures uses the Hershey fonts. The Hershey Fonts were originally created by Dr. A. V. Hershey while working at the U. S. National Bureau of Standards. The format of the font data used was originally created by James Hurt, Cognition, Inc., 900 Technology Park Drive, Billerica, MA 01821.

## Trademarks

APA and APA Style are trademarks of the American Psychological Association. This product is independent work; it is not affiliated with, endorsed by, or reviewed by the American Psychological Association, and it does not reproduce the Publication Manual.
