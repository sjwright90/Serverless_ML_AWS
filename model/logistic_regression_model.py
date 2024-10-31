# %%
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, confusion_matrix
import pickle
import seaborn as sns
import matplotlib.pyplot as plt

# %%
# Load data
df = pd.read_csv("data/data.csv")
df.head()
# %%
# Prepare data
X = df.drop(columns="target")
y = df["target"]
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.3, random_state=42
)
# %%
# Build pipeline
model = Pipeline(
    [
        ("scaler", StandardScaler()),
        ("classifier", LogisticRegression(random_state=42)),
    ]
)
model.fit(X_train, y_train)

# score
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
conf_matrix = confusion_matrix(y_test, y_pred)

fig, ax = plt.subplots()
_ = sns.heatmap(conf_matrix, annot=True, fmt="d", cmap="Blues", ax=ax)
_ = ax.set_xlabel("Predicted labels")
_ = ax.set_ylabel("True labels")
_ = ax.set_title("Confusion Matrix")
_ = ax.xaxis.set_ticklabels(["Negative", "Positive"])
# %%
# Save model
with open("./binary_sklearn_model.pkl", "wb") as f:
    pickle.dump(model, f)
# %%
