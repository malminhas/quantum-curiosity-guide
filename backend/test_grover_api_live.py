#!/usr/bin/env python3
"""
Live API testing for Grover's Algorithm API
Tests against a running API server using HTTP requests
"""

import pytest # type: ignore
import requests # type: ignore
import json
import time
import concurrent.futures
from typing import Dict, Any


# Test configuration
BASE_URL = "http://localhost:8087"
TIMEOUT = 30


@pytest.fixture(scope="session")
def api_health_check():
    """Check if API is running before starting tests"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            pytest.skip(f"API not healthy. Status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        pytest.skip(f"API not available at {BASE_URL}. Error: {e}")
    yield


class TestHealthEndpointsLive:
    """Test health check and information endpoints against live API"""
    
    def test_root_redirect(self, api_health_check):
        """Test that root endpoint redirects to docs"""
        response = requests.get(f"{BASE_URL}/", allow_redirects=False, timeout=TIMEOUT)
        assert response.status_code == 307
        assert response.headers["location"] == "/docs"
    
    def test_health_check(self, api_health_check):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["max_qubits"] == 3
        assert "simulator" in data["available_backends"]
        assert data["docs_url"] == "/docs"
        assert data["redoc_url"] == "/redoc"
    
    def test_info_endpoint(self, api_health_check):
        """Test detailed info endpoint"""
        response = requests.get(f"{BASE_URL}/info", timeout=TIMEOUT)
        assert response.status_code == 200
        
        data = response.json()
        assert data["algorithm"] == "Grover's Quantum Search Algorithm"
        assert data["supported_qubits"] == "1-3"
        assert data["time_complexity"] == "O(√N) where N is the search space size"
        assert data["classical_complexity"] == "O(N) for unstructured search"
        assert data["max_shots"] == 10000
        assert data["min_shots"] == 100
        
        # Check examples structure
        assert "examples" in data
        assert "1_qubit" in data["examples"]
        assert "2_qubit" in data["examples"]
        assert "3_qubit" in data["examples"]
        
        # Check technical details
        assert "technical_details" in data
        assert "oracle_implementation" in data["technical_details"]


class TestGroverSearchLive:
    """Test the main Grover search functionality against live API"""
    
    @pytest.mark.parametrize("target_state,expected_qubits,expected_iterations", [
        ("1", 1, 1),
        ("11", 2, 1),
        ("101", 3, 2),
        ("000", 3, 2),
        ("0", 1, 1),
    ])
    def test_valid_grover_search(self, api_health_check, target_state, expected_qubits, expected_iterations):
        """Test Grover search with valid inputs"""
        request_data = {
            "target_state": target_state,
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["target_state"] == target_state
        assert data["num_qubits"] == expected_qubits
        assert data["optimal_iterations"] == expected_iterations
        assert data["shots"] == 1000
        assert 0 <= data["success_rate"] <= 100
        assert data["circuit_depth"] > 0
        assert data["execution_time_ms"] > 0
        assert "timestamp" in data
        
        # Check measurements structure
        assert "measurements" in data
        measurements = data["measurements"]
        total_measurements = sum(measurements.values())
        assert total_measurements == 1000
        
        # Target state should be present in measurements
        assert target_state in measurements
    
    def test_high_success_rate_2qubit(self, api_health_check):
        """Test that 2-qubit search achieves high success rate"""
        request_data = {
            "target_state": "11",
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        data = response.json()
        
        # 2-qubit Grover should achieve very high success rate
        assert data["success_rate"] > 95.0
    
    def test_different_shot_counts(self, api_health_check):
        """Test with different shot counts"""
        for shots in [100, 500, 1000, 5000]:
            request_data = {
                "target_state": "11",
                "shots": shots,
                "backend": "simulator"
            }
            
            response = requests.post(
                f"{BASE_URL}/grover/search",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=TIMEOUT
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["shots"] == shots
            
            # Total measurements should equal shots
            total_measurements = sum(data["measurements"].values())
            assert total_measurements == shots


class TestGroverAnalysisLive:
    """Test the analysis endpoint against live API"""
    
    @pytest.mark.parametrize("target_state,expected_qubits,expected_space_size", [
        ("1", 1, 2),
        ("11", 2, 4),
        ("101", 3, 8),
        ("000", 3, 8),
    ])
    def test_valid_analysis(self, api_health_check, target_state, expected_qubits, expected_space_size):
        """Test analysis with valid target states"""
        response = requests.get(f"{BASE_URL}/grover/analyze/{target_state}", timeout=TIMEOUT)
        assert response.status_code == 200
        
        data = response.json()
        assert data["target_state"] == target_state
        
        analysis = data["analysis"]
        assert analysis["num_qubits"] == expected_qubits
        assert analysis["search_space_size"] == expected_space_size
        assert analysis["optimal_iterations"] > 0
        assert 0 <= analysis["theoretical_success_rate"] <= 100
        assert analysis["speedup_factor"] > 0
        
        # Check performance comparison
        comparison = data["performance_comparison"]
        assert comparison["classical_worst_case"] == expected_space_size
        assert comparison["classical_average_case"] == expected_space_size / 2
        assert comparison["quantum_grover"] > 0
        assert "advantage" in comparison


class TestCircuitInfoLive:
    """Test the circuit information endpoint against live API"""
    
    @pytest.mark.parametrize("target_state", ["1", "11", "101", "000"])
    def test_valid_circuit_info(self, api_health_check, target_state):
        """Test circuit info with valid target states"""
        response = requests.get(f"{BASE_URL}/grover/circuit/{target_state}", timeout=TIMEOUT)
        assert response.status_code == 200
        
        data = response.json()
        assert data["target_state"] == target_state
        
        circuit_info = data["circuit_info"]
        assert circuit_info["num_qubits"] == len(target_state)
        assert circuit_info["num_classical_bits"] == len(target_state)
        assert circuit_info["circuit_depth"] > 0
        assert circuit_info["total_gates"] > 0
        assert circuit_info["optimal_iterations"] > 0
        
        # Check that transpiled metrics are present
        assert "transpiled_depth" in circuit_info
        assert "transpiled_gates" in circuit_info
        
        # Circuit diagram should be a string
        assert isinstance(data["circuit_diagram"], str)
        assert len(data["circuit_diagram"]) > 0
        
        # Gate summary should be a dictionary
        assert isinstance(data["gate_summary"], dict)


class TestErrorHandlingLive:
    """Test error handling and validation against live API"""
    
    def test_invalid_target_states(self, api_health_check):
        """Test invalid target state formats"""
        invalid_states = [
            "abc",  # Non-binary
            "1010",  # Too many qubits
            "2",  # Invalid binary digit
            "10101",  # Way too many qubits
        ]
        
        for invalid_state in invalid_states:
            # Test search endpoint
            request_data = {
                "target_state": invalid_state,
                "shots": 1000,
                "backend": "simulator"
            }
            response = requests.post(
                f"{BASE_URL}/grover/search",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=TIMEOUT
            )
            assert response.status_code == 422  # Validation error
            
            # Test analysis endpoint - pattern mismatch returns 422
            response = requests.get(f"{BASE_URL}/grover/analyze/{invalid_state}", timeout=TIMEOUT)
            assert response.status_code == 422  # FastAPI path pattern validation returns 422
            
            # Test circuit endpoint - pattern mismatch returns 422
            response = requests.get(f"{BASE_URL}/grover/circuit/{invalid_state}", timeout=TIMEOUT)
            assert response.status_code == 422  # FastAPI path pattern validation returns 422
    
    def test_empty_target_state(self, api_health_check):
        """Test empty target state (different behavior - route not found)"""
        # Empty string causes route not found (404) because the route path doesn't match
        response = requests.get(f"{BASE_URL}/grover/analyze/", timeout=TIMEOUT)
        assert response.status_code == 404  # Route not found
        
        response = requests.get(f"{BASE_URL}/grover/circuit/", timeout=TIMEOUT)
        assert response.status_code == 404  # Route not found
    
    def test_invalid_shot_counts(self, api_health_check):
        """Test invalid shot count values"""
        invalid_shots = [50, 0, -100, 20000]  # Too low, zero, negative, too high
        
        for shots in invalid_shots:
            request_data = {
                "target_state": "11",
                "shots": shots,
                "backend": "simulator"
            }
            response = requests.post(
                f"{BASE_URL}/grover/search",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=TIMEOUT
            )
            assert response.status_code == 422  # Validation error
    
    def test_missing_required_fields(self, api_health_check):
        """Test requests missing required fields"""
        # Missing target_state
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json={"shots": 1000},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert response.status_code == 422
        
        # Missing shots (should use default)
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json={"target_state": "11"},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert response.status_code == 200  # Should work with default shots


class TestConcurrencyLive:
    """Test concurrent requests against live API"""
    
    def test_concurrent_searches(self, api_health_check):
        """Test multiple concurrent search requests"""
        def make_search_request(target_state):
            request_data = {
                "target_state": target_state,
                "shots": 500,
                "backend": "simulator"
            }
            response = requests.post(
                f"{BASE_URL}/grover/search",
                json=request_data,
                headers={"Content-Type": "application/json"},
                timeout=TIMEOUT
            )
            return response.status_code, response.json()
        
        # Test concurrent requests
        target_states = ["1", "11", "101", "000", "111"]
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_search_request, state) for state in target_states]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        for status_code, data in results:
            assert status_code == 200
            assert "target_state" in data
            assert data["shots"] == 500


class TestResponseValidationLive:
    """Test response data validation and consistency against live API"""
    
    def test_search_response_structure(self, api_health_check):
        """Test that search responses have correct structure"""
        request_data = {
            "target_state": "11",
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        data = response.json()
        
        # Required fields
        required_fields = [
            "target_state", "num_qubits", "optimal_iterations", 
            "shots", "success_rate", "measurements", 
            "circuit_depth", "execution_time_ms", "timestamp"
        ]
        
        for field in required_fields:
            assert field in data
        
        # Type validation
        assert isinstance(data["target_state"], str)
        assert isinstance(data["num_qubits"], int)
        assert isinstance(data["optimal_iterations"], int)
        assert isinstance(data["shots"], int)
        assert isinstance(data["success_rate"], (int, float))
        assert isinstance(data["measurements"], dict)
        assert isinstance(data["circuit_depth"], int)
        assert isinstance(data["execution_time_ms"], (int, float))
        assert isinstance(data["timestamp"], str)


@pytest.mark.slow
class TestPerformanceLive:
    """Performance tests against live API"""
    
    def test_large_shot_count_performance(self, api_health_check):
        """Test performance with large shot counts"""
        request_data = {
            "target_state": "101",
            "shots": 10000,
            "backend": "simulator"
        }
        
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/grover/search",
            json=request_data,
            headers={"Content-Type": "application/json"},
            timeout=60  # Longer timeout for large shot count
        )
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 15.0  # Should complete within 15 seconds


if __name__ == "__main__":
    # Usage: python test_grover_api_live.py
    # Make sure the API is running first: uvicorn grover_api:app --reload
    pytest.main([__file__, "-v", "--tb=short"]) 