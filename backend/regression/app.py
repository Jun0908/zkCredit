from flask import Flask, request, jsonify
from flask_cors import CORS
import xgboost as xgb
import pandas as pd

# Flask application initialization
app = Flask(__name__)

# CORS configuration
CORS(app, resources={r"/*": {"origins": "*"}})

# Load the trained XGBoost model
model_path = 'model/xgboost_credit_score_model.dat'
model = xgb.XGBRegressor()
model.load_model(model_path)

# Create endpoint
@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    print('Predicting...')
    if request.method == 'OPTIONS':
        # Preflight request. Reply successfully:
        return jsonify(success=True), 200

    # Receive data from client in JSON format
    data = request.get_json(force=True)
    
    # Convert JSON data to DataFrame
    input_data = pd.DataFrame(data, index=[0])
    
    # Check if 'Credit Score' column exists and remove it
    if 'Credit Score' in input_data.columns:
        input_data = input_data.drop(columns=['Credit Score'])
    
    # Make prediction using the model
    prediction = model.predict(input_data)
    
    # Return the result in JSON format
    return jsonify({'prediction': float(prediction[0])})

# Main program
if __name__ == '__main__':
    # Start API server
    app.run(debug=True, host='0.0.0.0', port=5001)