import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import xgboost as xgb
import joblib

# Step 1: Load the JSON data into a pandas DataFrame
data = pd.read_json('nigeria_fintech_with_scaled_credit_scores.json')

# Step 2: Preprocessing
# Here we assume "Credit Score" is the target variable
X = data.drop("Credit Score", axis=1)  # Features (exclude Credit Score)
y = data["Credit Score"]  # Target (Credit Score)

# Optionally scale the features (important for some models)
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Step 3: Split the data into training and test sets
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# Step 4: Train the XGBoost model
xgb_model = xgb.XGBRegressor(objective='reg:squarederror', use_label_encoder=False)
xgb_model.fit(X_train, y_train)

# Step 5: Save the trained model to a file
xgb_model.save_model('xgboost_credit_score_model.dat')
