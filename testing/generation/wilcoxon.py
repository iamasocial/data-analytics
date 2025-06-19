import numpy as np
import pandas as pd
import os

def generate_wilcox_samples():
    os.makedirs("../datasets", exist_ok=True)

    n = 15

    # Значимые различия: "после" сдвинуто на +2 относительно "до"
    before_significant = np.random.normal(loc=50, scale=5, size=n)
    after_significant = before_significant + np.random.normal(loc=2, scale=1, size=n)

    df_significant = pd.DataFrame({
        "Before": before_significant,
        "After": after_significant
    })
    df_significant.to_csv("../datasets/Wilcox_Paired_Significant.csv", index=False)

    # Без различий: "после" близко к "до"
    before_nodiff = np.random.normal(loc=50, scale=5, size=n)
    after_nodiff = before_nodiff + np.random.normal(loc=0, scale=1, size=n)

    df_nodiff = pd.DataFrame({
        "Before": before_nodiff,
        "After": after_nodiff
    })
    df_nodiff.to_csv("../datasets/Wilcox_Paired_NoDiff.csv", index=False)

if __name__ == "__main__":
    generate_wilcox_samples()
