# python-server/analysis_modules/binomial.py
import pandas as pd
from scipy import stats
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from collections import Counter

# Default confidence level for intervals
DEFAULT_CONFIDENCE_LEVEL = 0.95
# Default significance level for GoF test conclusion
DEFAULT_ALPHA_GOF = 0.05
# Minimum expected frequency for Chi-Square GoF test
MIN_EXPECTED_FREQ = 5

def perform_binomial_analysis(
    df: pd.DataFrame,
    column_name: str,
    confidence_level: float = DEFAULT_CONFIDENCE_LEVEL
) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """
    Performs analysis on a column assumed to contain binomial counts.
    Infers n, estimates p, calculates CI, and performs Chi-Square GoF test.

    Args:
        df: Input DataFrame.
        column_name: The name of the column with the number of successes.
        confidence_level: Confidence level for the proportion estimate interval.

    Returns:
        A tuple containing:
        - A dictionary with analysis results if successful, None otherwise.
        - A list of processing log strings.
    """
    logs = []
    results = None
    alpha_gof = 1 - confidence_level # Use same alpha for GoF conclusion

    if column_name not in df.columns:
        logs.append(f"Error: Column '{column_name}' not found for binomial analysis.")
        return None, logs

    data = df[column_name].dropna()

    if not (pd.api.types.is_integer_dtype(data) or \
            (pd.api.types.is_float_dtype(data) and np.all(data == data.astype(int)))):
        logs.append(f"Skipping column '{column_name}' for binomial analysis (not integer counts).")
        return None, logs

    if data.empty:
        logs.append(f"Skipping column '{column_name}' for binomial analysis (empty after dropna).")
        return None, logs

    # Convert to int just in case it was float with int values
    try:
        data = data.astype(int)
    except (ValueError, TypeError):
         logs.append(f"Error converting column '{column_name}' to integer for binomial analysis.")
         return None, logs

    if (data < 0).any():
        logs.append(f"Skipping column '{column_name}' for binomial analysis (contains negative values).")
        return None, logs

    # --- Infer n from data --- 
    inferred_n = data.max()
    logs.append(f"Binomial analysis for '{column_name}': Inferred n = {inferred_n} (max value in column).")

    if inferred_n <= 0:
        logs.append(f"Skipping column '{column_name}' for binomial analysis (inferred n is <= 0).")
        return None, logs

    total_experiments = len(data)
    total_successes = int(data.sum())
    total_possible_successes = total_experiments * inferred_n

    if total_possible_successes <= 0:
         logs.append(f"Error: Cannot perform binomial analysis with zero total possible successes (experiments={total_experiments}, inferred_n={inferred_n}).")
         return None, logs

    # --- Estimate p and calculate Confidence Interval --- 
    estimated_p = total_successes / total_possible_successes
    logs.append(f"  Estimated p = {estimated_p:.4f} (Total Successes / (Experiments * n))")

    # Use binomtest just for CI calculation (it handles edge cases)
    # We need k (total successes) and N (total trials = total_experiments * inferred_n)
    try:
        ci_result = stats.binomtest(k=total_successes, n=total_possible_successes, p=0.5) # p=0.5 is arbitrary here, only CI is used
        conf_interval = ci_result.proportion_ci(confidence_level=confidence_level)
        ci_lower = conf_interval.low
        ci_upper = conf_interval.high
        logs.append(f"  Confidence Interval ({100*confidence_level:.1f}%) for p: [{ci_lower:.4f}, {ci_upper:.4f}]")
    except Exception as e:
        logs.append(f"Warning: Could not calculate confidence interval for '{column_name}': {e}")
        ci_lower = np.nan
        ci_upper = np.nan

    # --- Perform Chi-Square Goodness-of-Fit Test --- 
    logs.append("  Performing Chi-Square goodness-of-fit test against Binomial(n, p_hat)...")
    gof_statistic = np.nan
    gof_p_value = np.nan
    gof_conclusion = "Test not performed"
    gof_warning = False

    try:
        # 1. Observed frequencies
        observed_counts = Counter(data)
        observed_freq = [observed_counts.get(i, 0) for i in range(inferred_n + 1)]

        # 2. Expected frequencies under B(n, p_hat)
        expected_freq = []
        for i in range(inferred_n + 1):
            prob = stats.binom.pmf(k=i, n=inferred_n, p=estimated_p)
            expected_freq.append(prob * total_experiments)

        # 3. Check for low expected frequencies and combine if necessary
        observed_freq_comb = []
        expected_freq_comb = []
        current_obs = 0
        current_exp = 0
        categories_combined = 0

        for i in range(len(expected_freq)):
            current_obs += observed_freq[i]
            current_exp += expected_freq[i]
            if current_exp >= MIN_EXPECTED_FREQ or i == len(expected_freq) - 1:
                if current_exp < MIN_EXPECTED_FREQ and len(expected_freq_comb) > 0:
                    # Combine with the previous category if the last one is too small
                    observed_freq_comb[-1] += current_obs
                    expected_freq_comb[-1] += current_exp
                    categories_combined += 1 # Count how many original categories went into this group
                else:
                    observed_freq_comb.append(current_obs)
                    expected_freq_comb.append(current_exp)
                    categories_combined = 1 # Reset counter
                # Reset accumulators
                current_obs = 0
                current_exp = 0
            else:
                 categories_combined += 1 # Category is being held for potential combination
        
        if len(observed_freq_comb) < 2:
             logs.append(f"  Warning: GoF test skipped for '{column_name}'. Not enough categories after grouping low expected frequencies.")
             gof_conclusion = "Skipped (too few categories after grouping)"
             gof_warning = True
        else:
             # Check again if any combined expected frequency is too low
             if any(ef < MIN_EXPECTED_FREQ for ef in expected_freq_comb):
                 logs.append(f"  Warning: GoF test for '{column_name}' may be unreliable due to low expected frequencies even after grouping.")
                 gof_warning = True
             else:
                  logs.append(f"  GoF test: Using {len(expected_freq_comb)} categories after grouping.")

             # 4. Calculate Chi-Square statistic
             # ddof=1 because we estimated one parameter (p) from the data
             gof_result = stats.chisquare(f_obs=observed_freq_comb, f_exp=expected_freq_comb, ddof=1)
             gof_statistic = gof_result.statistic
             gof_p_value = gof_result.pvalue

             if gof_p_value < alpha_gof:
                 gof_conclusion = f"Reject hypothesis: Data distribution differs significantly from Binomial(n={inferred_n}, p={estimated_p:.3f})"
             else:
                 gof_conclusion = f"Fail to reject hypothesis: Data distribution is consistent with Binomial(n={inferred_n}, p={estimated_p:.3f})"
             logs.append(f"  GoF test result: Chi2={gof_statistic:.4f}, p-value={gof_p_value:.4f}, Conclusion: {gof_conclusion}")

    except Exception as e:
        logs.append(f"Error during Chi-Square GoF test calculation for '{column_name}': {e}")
        gof_conclusion = "Error during calculation"
        gof_warning = True

    # --- Assemble results --- 
    results = {
        "variable_name": column_name,
        "total_experiments": total_experiments,
        "inferred_n": inferred_n,
        "total_successes": total_successes,
        "estimated_prob": estimated_p,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "confidence_level": confidence_level,
        "gof_statistic": gof_statistic,
        "gof_p_value": gof_p_value,
        "gof_conclusion": gof_conclusion,
        "gof_warning": gof_warning
    }

    return results, logs 