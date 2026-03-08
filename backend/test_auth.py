import requests
import json

url = "http://localhost:4000/api/v1/auth/login"
payload = {
    "credential": "admin@luna.com",
    "password": "admin123"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Status: {response.status_code}")
    print(response.json())
    
    if response.status_code == 200:
        token = response.json()['data']['accessToken']
        print(f"\nTesting with token: {token[:20]}...")
        
        test_url = "http://localhost:4000/api/v1/settlements/stats"
        test_headers = {
            "Authorization": f"Bearer {token}"
        }
        test_response = requests.get(test_url, headers=test_headers)
        print(f"Stats Status: {test_response.status_code}")
        print(test_response.json())
except Exception as e:
    print(f"Error: {e}")
