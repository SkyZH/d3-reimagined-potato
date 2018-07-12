import pandas as pd
import numpy as np
from datetime import datetime
import tushare as ts
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/<string:code>/<string:start>/<string:end>")
def retrive_data(code, start, end):
    data = ts.get_k_data(code, autype=None, start=start, end=end)
    response = app.response_class(
        response=data.to_json(),
        status=200,
        mimetype='application/json'
    )
    return response

if __name__ == '__main__':
    app.run(debug=True)
