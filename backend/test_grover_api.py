#!/usr/bin/env python3
"""
Test script for the Grover's Algorithm API
Demonstrates all endpoints with various qubit configurations
"""

import requests # type: ignore
import json
import time
from typing import Dict, Any

API_BASE_URL = "http://localhost:8087"

def make_request(method: str, endpoint: str, data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Make HTTP request and handle response"""
    url = f"{API_BASE_URL}{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url)
        elif method.upper() == "POST":
            response = requests.post(url, json=data)
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        response.raise_for_status()
        return response.json()
    
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return {"error": str(e)}

def test_api_info():
    """Test basic API information endpoints"""
    print("🔍 Testing API Information Endpoints")
    print("=" * 50)
    
    # Test root endpoint
    result = make_request("GET", "/")
    print("📋 API Root:")
    print(json.dumps(result, indent=2))
    print()
    
    # Test info endpoint
    result = make_request("GET", "/info")
    print("📊 API Info:")
    print(json.dumps(result, indent=2))
    print()

def test_circuit_analysis():
    """Test circuit analysis endpoints"""
    print("🔧 Testing Circuit Analysis")
    print("=" * 50)
    
    test_states = ["1", "11", "101"]
    
    for state in test_states:
        print(f"\n🎯 Analyzing state '{state}':")
        
        # Test analysis endpoint
        result = make_request("GET", f"/grover/analyze/{state}")
        if "error" not in result:
            analysis = result["analysis"]
            print(f"   📊 {analysis['num_qubits']} qubits, {analysis['search_space_size']} states")
            print(f"   🔄 Optimal iterations: {analysis['optimal_iterations']}")
            print(f"   📈 Expected success: {analysis['theoretical_success_rate']}%")
            print(f"   ⚡ Speedup: {analysis['speedup_factor']}x")
        
        # Test circuit info endpoint
        result = make_request("GET", f"/grover/circuit/{state}")
        if "error" not in result:
            info = result["circuit_info"]
            print(f"   🔧 Circuit depth: {info['circuit_depth']}, Gates: {info['total_gates']}")

def test_grover_search():
    """Test the main Grover search functionality"""
    print("\n🚀 Testing Grover Search Execution")
    print("=" * 50)
    
    test_cases = [
        {"target_state": "1", "shots": 1000, "expected_success": "> 95%"},
        {"target_state": "11", "shots": 1000, "expected_success": "> 95%"},
        {"target_state": "101", "shots": 1000, "expected_success": "> 85%"},
    ]
    
    for case in test_cases:
        print(f"\n🎯 Testing search for '{case['target_state']}':")
        
        request_data = {
            "target_state": case["target_state"],
            "shots": case["shots"],
            "backend": "simulator"
        }
        
        start_time = time.time()
        result = make_request("POST", "/grover/search", request_data)
        execution_time = time.time() - start_time
        
        if "error" not in result:
            print(f"   ✅ Success rate: {result['success_rate']:.1f}% (expected {case['expected_success']})")
            print(f"   🔄 Optimal iterations: {result['optimal_iterations']}")
            print(f"   ⏱️  Execution time: {result['execution_time_ms']:.2f}ms (total: {execution_time*1000:.1f}ms)")
            print(f"   📊 Circuit depth: {result['circuit_depth']}")
            
            # Show measurement distribution
            measurements = result["measurements"]
            total_shots = sum(measurements.values())
            print(f"   📈 Measurement distribution:")
            for state, count in sorted(measurements.items()):
                percentage = (count / total_shots) * 100
                marker = "🎯" if state == case["target_state"] else "  "
                print(f"      {marker} |{state}⟩: {count:4d} ({percentage:5.1f}%)")
        else:
            print(f"   ❌ Failed: {result['error']}")

def test_error_handling():
    """Test API error handling"""
    print("\n⚠️  Testing Error Handling")
    print("=" * 50)
    
    error_cases = [
        {"endpoint": "/grover/search", "data": {"target_state": "abc", "shots": 1000}, "expected": "Invalid target state"},
        {"endpoint": "/grover/search", "data": {"target_state": "1010", "shots": 1000}, "expected": "Too many qubits"},
        {"endpoint": "/grover/search", "data": {"target_state": "11", "shots": 50}, "expected": "Too few shots"},
        {"endpoint": "/grover/analyze/xyz", "data": None, "expected": "Invalid format"},
    ]
    
    for case in error_cases:
        print(f"\n🧪 Testing error case: {case['expected']}")
        if case["data"]:
            result = make_request("POST", case["endpoint"], case["data"])
        else:
            result = make_request("GET", case["endpoint"])
        
        if "error" in result or "detail" in result:
            print(f"   ✅ Correctly caught error")
        else:
            print(f"   ❌ Error not caught: {result}")

def main():
    """Run all tests"""
    print("🔬 Grover's Algorithm API Test Suite")
    print("=" * 60)
    print("Starting comprehensive API testing...\n")
    
    # Check if API is running
    try:
        response = requests.get(f"{API_BASE_URL}/")
        response.raise_for_status()
        print("✅ API is running and accessible\n")
    except requests.exceptions.RequestException:
        print("❌ API is not accessible. Please start the server with:")
        print("   python grover_api.py")
        print("   or")
        print("   uvicorn grover_api:app --reload")
        return
    
    # Run test suites
    test_api_info()
    test_circuit_analysis()
    test_grover_search()
    test_error_handling()
    
    print("\n🎉 Test suite completed!")
    print("\n📚 Documentation & Usage:")
    print("   🔗 Swagger UI:     http://localhost:8087/docs")
    print("   📖 ReDoc:         http://localhost:8087/redoc")
    print("   ❤️  Health Check:  http://localhost:8087/health")
    print("\n📝 API Usage Examples:")
    print("   curl http://localhost:8087/health")
    print("   curl http://localhost:8087/grover/analyze/11")
    print("   curl -X POST http://localhost:8087/grover/search \\")
    print('        -H "Content-Type: application/json" \\')
    print('        -d \'{"target_state": "101", "shots": 1000}\'')

if __name__ == "__main__":
    main() 