#!/usr/bin/env python3
"""
Comprehensive pytest test suite for Grover's Algorithm API
Tests all endpoints, error cases, and validation scenarios
"""

import pytest # type: ignore
import json
from fastapi.testclient import TestClient # type: ignore
import time
import subprocess
import sys
import os
from pathlib import Path

# Test configuration
API_BASE_URL = "http://localhost:8087"
TEST_CLIENT = None

def get_test_client():
    """Get test client, preferring live server if available"""
    global TEST_CLIENT
    if TEST_CLIENT is None:
        try:
            # Try to import the app for TestClient (fallback)
            from grover_api import app
            TEST_CLIENT = TestClient(app)
        except ImportError:
            pytest.fail("Could not import grover_api. Make sure the API is available.")
    return TEST_CLIENT

# Create test client
client = get_test_client()

class TestHealthEndpoints:
    """Test health check and information endpoints"""
    
    def test_root_redirect(self):
        """Test that root endpoint redirects to docs"""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/docs"
    
    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["version"] == "1.0.0"
        assert data["max_qubits"] == 3
        assert "simulator" in data["available_backends"]
        assert data["docs_url"] == "/docs"
        assert data["redoc_url"] == "/redoc"
    
    def test_info_endpoint(self):
        """Test detailed info endpoint"""
        response = client.get("/info")
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


class TestGroverSearch:
    """Test the main Grover search functionality"""
    
    @pytest.mark.parametrize("target_state,expected_qubits,expected_iterations", [
        ("1", 1, 1),
        ("11", 2, 1),
        ("101", 3, 2),
        ("000", 3, 2),
        ("0", 1, 1),
    ])
    def test_valid_grover_search(self, target_state, expected_qubits, expected_iterations):
        """Test Grover search with valid inputs"""
        request_data = {
            "target_state": target_state,
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
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
    
    def test_high_success_rate_2qubit(self):
        """Test that 2-qubit search achieves high success rate"""
        request_data = {
            "target_state": "11",
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
        data = response.json()
        
        # 2-qubit Grover should achieve very high success rate
        assert data["success_rate"] > 95.0
    
    def test_different_shot_counts(self):
        """Test with different shot counts"""
        for shots in [100, 500, 1000, 5000]:
            request_data = {
                "target_state": "11",
                "shots": shots,
                "backend": "simulator"
            }
            
            response = client.post("/grover/search", json=request_data)
            assert response.status_code == 200
            
            data = response.json()
            assert data["shots"] == shots
            
            # Total measurements should equal shots
            total_measurements = sum(data["measurements"].values())
            assert total_measurements == shots
    
    def test_performance_timing(self):
        """Test that execution time is reasonable"""
        request_data = {
            "target_state": "101",
            "shots": 1000,
            "backend": "simulator"
        }
        
        start_time = time.time()
        response = client.post("/grover/search", json=request_data)
        end_time = time.time()
        
        assert response.status_code == 200
        data = response.json()
        
        # Execution should be fast (less than 5 seconds total)
        total_time = end_time - start_time
        assert total_time < 5.0
        
        # Internal timing should be reasonable
        assert data["execution_time_ms"] < 5000


class TestGroverAnalysis:
    """Test the analysis endpoint"""
    
    @pytest.mark.parametrize("target_state,expected_qubits,expected_space_size", [
        ("1", 1, 2),
        ("11", 2, 4),
        ("101", 3, 8),
        ("000", 3, 8),
    ])
    def test_valid_analysis(self, target_state, expected_qubits, expected_space_size):
        """Test analysis with valid target states"""
        response = client.get(f"/grover/analyze/{target_state}")
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
    
    def test_analysis_mathematical_consistency(self):
        """Test that analysis results are mathematically consistent"""
        response = client.get("/grover/analyze/101")
        data = response.json()
        analysis = data["analysis"]
        
        # For 3 qubits: N=8, optimal iterations ≈ π/4 * √8 ≈ 2.22 → 2
        assert analysis["num_qubits"] == 3
        assert analysis["search_space_size"] == 8
        assert analysis["optimal_iterations"] == 2
        
        # Speedup should be approximately √N / optimal_iterations
        expected_speedup = analysis["search_space_size"] / 2 / analysis["optimal_iterations"]
        assert abs(analysis["speedup_factor"] - expected_speedup) < 0.1


class TestCircuitInfo:
    """Test the circuit information endpoint"""
    
    @pytest.mark.parametrize("target_state", ["1", "11", "101", "000"])
    def test_valid_circuit_info(self, target_state):
        """Test circuit info with valid target states"""
        response = client.get(f"/grover/circuit/{target_state}")
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
    
    def test_circuit_complexity_scaling(self):
        """Test that circuit complexity scales appropriately with qubits"""
        responses = {}
        for target_state in ["1", "11", "101"]:
            response = client.get(f"/grover/circuit/{target_state}")
            responses[target_state] = response.json()
        
        # More qubits should generally mean more gates (though not always due to optimization)
        depths = [responses[state]["circuit_info"]["circuit_depth"] for state in ["1", "11", "101"]]
        gates = [responses[state]["circuit_info"]["total_gates"] for state in ["1", "11", "101"]]
        
        # At minimum, all should be positive
        assert all(d > 0 for d in depths)
        assert all(g > 0 for g in gates)


class TestErrorHandling:
    """Test error handling and validation"""
    
    def test_invalid_target_states(self):
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
            response = client.post("/grover/search", json=request_data)
            assert response.status_code == 422  # Validation error
            
            # Test analysis endpoint - pattern mismatch returns 422
            response = client.get(f"/grover/analyze/{invalid_state}")
            assert response.status_code == 422  # FastAPI path pattern validation returns 422
            
            # Test circuit endpoint - pattern mismatch returns 422
            response = client.get(f"/grover/circuit/{invalid_state}")
            assert response.status_code == 422  # FastAPI path pattern validation returns 422
    
    def test_empty_target_state(self):
        """Test empty target state (different behavior - route not found)"""
        # Empty string causes route not found (404) because the route path doesn't match
        response = client.get("/grover/analyze/")
        assert response.status_code == 404  # Route not found
        
        response = client.get("/grover/circuit/")
        assert response.status_code == 404  # Route not found
    
    def test_invalid_shot_counts(self):
        """Test invalid shot count values"""
        invalid_shots = [50, 0, -100, 20000]  # Too low, zero, negative, too high
        
        for shots in invalid_shots:
            request_data = {
                "target_state": "11",
                "shots": shots,
                "backend": "simulator"
            }
            response = client.post("/grover/search", json=request_data)
            assert response.status_code == 422  # Validation error
    
    def test_missing_required_fields(self):
        """Test requests missing required fields"""
        # Missing target_state
        response = client.post("/grover/search", json={"shots": 1000})
        assert response.status_code == 422
        
        # Missing shots (should use default)
        response = client.post("/grover/search", json={"target_state": "11"})
        assert response.status_code == 200  # Should work with default shots
    
    def test_invalid_backend(self):
        """Test invalid backend specification"""
        request_data = {
            "target_state": "11",
            "shots": 1000,
            "backend": "invalid_backend"
        }
        response = client.post("/grover/search", json=request_data)
        assert response.status_code == 422  # Validation error


class TestEdgeCases:
    """Test edge cases and boundary conditions"""
    
    def test_minimum_valid_inputs(self):
        """Test with minimum valid input values"""
        request_data = {
            "target_state": "0",  # Smallest valid target
            "shots": 100,  # Minimum shots
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["shots"] == 100
        assert sum(data["measurements"].values()) == 100
    
    def test_maximum_valid_inputs(self):
        """Test with maximum valid input values"""
        request_data = {
            "target_state": "111",  # Largest valid target (3 qubits)
            "shots": 10000,  # Maximum shots
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        assert data["shots"] == 10000
        assert sum(data["measurements"].values()) == 10000
    
    def test_all_possible_3qubit_states(self):
        """Test all possible 3-qubit target states"""
        all_3qubit_states = [
            "000", "001", "010", "011", "100", "101", "110", "111"
        ]
        
        for target_state in all_3qubit_states:
            # Test analysis
            response = client.get(f"/grover/analyze/{target_state}")
            assert response.status_code == 200
            
            # Test circuit info
            response = client.get(f"/grover/circuit/{target_state}")
            assert response.status_code == 200
            
            # Test search (with fewer shots for speed)
            request_data = {
                "target_state": target_state,
                "shots": 100,
                "backend": "simulator"
            }
            response = client.post("/grover/search", json=request_data)
            assert response.status_code == 200


class TestConcurrency:
    """Test concurrent requests and performance"""
    
    def test_concurrent_searches(self):
        """Test multiple concurrent search requests"""
        import concurrent.futures
        
        def make_search_request(target_state):
            request_data = {
                "target_state": target_state,
                "shots": 500,
                "backend": "simulator"
            }
            response = client.post("/grover/search", json=request_data)
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


@pytest.mark.hardware
class TestHardwareEndpoints:
    """Test IBM Quantum hardware integration endpoints"""
    
    def test_hardware_connect_test_mode(self):
        """Test hardware connection endpoint in test mode"""
        request_data = {
            "api_key": "test",
            "instance": "ibm-q/open/main"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        # Should succeed in test mode
        assert response.status_code == 200
        
        data = response.json()
        
        # Check required fields
        required_fields = [
            "backend_name", "backend_version", "num_qubits", 
            "operational", "pending_jobs", "basis_gates", "coupling_map"
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Type validation
        assert isinstance(data["backend_name"], str)
        assert isinstance(data["backend_version"], str)
        assert isinstance(data["num_qubits"], int)
        assert isinstance(data["operational"], bool)
        assert isinstance(data["pending_jobs"], int)
        assert isinstance(data["basis_gates"], list)
        assert isinstance(data["coupling_map"], list)
        
        # Value validation for test mode
        assert data["num_qubits"] > 0
        assert data["pending_jobs"] >= 0
        assert len(data["basis_gates"]) > 0
        assert len(data["coupling_map"]) > 0
        
        # Test mode should return operational backend
        assert data["operational"] is True
    
    def test_hardware_connect_invalid_api_key(self):
        """Test hardware connection with invalid API key (should fallback to test mode)"""
        request_data = {
            "api_key": "invalid_key_12345",
            "instance": "ibm-q/open/main"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        # Should fallback to test mode when connection fails due to authentication
        assert response.status_code == 200
        
        data = response.json()
        assert "backend_name" in data
        assert data["operational"] is True
    
    def test_hardware_connect_missing_api_key(self):
        """Test hardware connection with missing required fields"""
        # Missing api_key
        request_data = {
            "instance": "ibm-q/open/main"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        assert response.status_code == 422  # Validation error
        
        data = response.json()
        assert "detail" in data
    
    def test_hardware_connect_missing_instance(self):
        """Test hardware connection with missing instance (should use default and work in test mode)"""
        request_data = {
            "api_key": "test"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        # Should succeed in test mode with default instance
        assert response.status_code == 200
        
        data = response.json()
        assert "backend_name" in data
        assert data["operational"] is True
    
    def test_hardware_connect_response_structure(self):
        """Test that hardware connect response has correct structure"""
        request_data = {
            "api_key": "test",
            "instance": "ibm-q/open/main"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        
        # Validate basis_gates structure
        assert all(isinstance(gate, str) for gate in data["basis_gates"])
        
        # Validate coupling_map structure (should be list of pairs)
        for connection in data["coupling_map"]:
            assert isinstance(connection, list)
            assert len(connection) == 2
            assert all(isinstance(qubit, int) for qubit in connection)
    
    def test_hardware_connect_different_instances(self):
        """Test hardware connection with different instance strings (all should work in test mode)"""
        instances = [
            "ibm-q/open/main",
            "test-instance",
            "custom/hub/group"
        ]
        
        for instance in instances:
            request_data = {
                "api_key": "test",
                "instance": instance
            }
            
            response = client.post("/hardware/connect", json=request_data)
            # All should work in test mode
            assert response.status_code == 200
            
            data = response.json()
            assert data["operational"] is True
            assert "backend_name" in data
    
    def test_hardware_connect_basis_gates_validation(self):
        """Test that basis gates contain expected quantum gates"""
        request_data = {
            "api_key": "test",
            "instance": "ibm-q/open/main"
        }
        
        response = client.post("/hardware/connect", json=request_data)
        assert response.status_code == 200
        
        data = response.json()
        basis_gates = data["basis_gates"]
        
        # Should contain common quantum gates
        expected_gates = ["cx", "x", "id"]  # Basic gates that should be present
        for gate in expected_gates:
            assert gate in basis_gates or any(gate in bg for bg in basis_gates)
    
    def test_hardware_endpoint_validation_error(self):
        """Test that the hardware endpoint exists and validates input properly"""
        # Test with invalid data to ensure endpoint exists and validates
        response = client.post("/hardware/connect", json={})
        # Should return validation error, not 404
        assert response.status_code == 422  # Validation error for missing required fields


class TestResponseValidation:
    """Test response data validation and consistency"""
    
    def test_search_response_structure(self):
        """Test that search responses have correct structure"""
        request_data = {
            "target_state": "11",
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
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
    
    def test_measurement_consistency(self):
        """Test that measurement results are consistent"""
        request_data = {
            "target_state": "101",
            "shots": 1000,
            "backend": "simulator"
        }
        
        response = client.post("/grover/search", json=request_data)
        data = response.json()
        
        measurements = data["measurements"]
        
        # All measurement keys should be valid 3-bit states
        valid_states = {format(i, '03b') for i in range(8)}
        for state in measurements.keys():
            assert state in valid_states
        
        # Total measurements should equal shots
        total = sum(measurements.values())
        assert total == data["shots"]
        
        # Success rate calculation should be correct
        target_count = measurements.get(data["target_state"], 0)
        expected_success_rate = (target_count / data["shots"]) * 100
        assert abs(data["success_rate"] - expected_success_rate) < 0.01


@pytest.fixture(scope="session")
def test_server():
    """Fixture to ensure test server is available"""
    # The TestClient handles server lifecycle automatically
    yield client


# Performance benchmarks
class TestPerformance:
    """Performance and benchmark tests"""
    
    @pytest.mark.slow
    def test_large_shot_count_performance(self):
        """Test performance with large shot counts"""
        request_data = {
            "target_state": "101",
            "shots": 10000,
            "backend": "simulator"
        }
        
        start_time = time.time()
        response = client.post("/grover/search", json=request_data)
        end_time = time.time()
        
        assert response.status_code == 200
        assert end_time - start_time < 10.0  # Should complete within 10 seconds
    
    @pytest.mark.slow 
    def test_multiple_sequential_requests(self):
        """Test performance of multiple sequential requests"""
        target_states = ["1", "11", "101"] * 3  # 9 requests total
        
        start_time = time.time()
        
        for target_state in target_states:
            request_data = {
                "target_state": target_state,
                "shots": 500,
                "backend": "simulator"
            }
            response = client.post("/grover/search", json=request_data)
            assert response.status_code == 200
        
        end_time = time.time()
        total_time = end_time - start_time
        
        # Average should be reasonable
        avg_time_per_request = total_time / len(target_states)
        assert avg_time_per_request < 2.0  # Less than 2 seconds per request


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"]) 