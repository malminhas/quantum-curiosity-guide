#!/usr/bin/env python3
"""
Test runner script for Grover API
Provides convenient commands for different testing scenarios
"""

import subprocess
import sys
import argparse
import time
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle output"""
    print(f"\n{'='*60}")
    print(f"🚀 {description}")
    print(f"{'='*60}")
    
    start_time = time.time()
    result = subprocess.run(cmd, shell=True, capture_output=False)
    end_time = time.time()
    
    duration = end_time - start_time
    if result.returncode == 0:
        print(f"✅ {description} completed successfully in {duration:.2f}s")
    else:
        print(f"❌ {description} failed after {duration:.2f}s")
        return False
    return True


def run_fast_tests():
    """Run only fast tests (excluding slow markers)"""
    cmd = 'pytest test_grover_pytest.py -m "not slow" -v'
    return run_command(cmd, "Running Fast Tests")


def run_all_tests():
    """Run all tests including slow ones"""
    cmd = 'pytest test_grover_pytest.py -v'
    return run_command(cmd, "Running All Tests")


def run_live_api_tests():
    """Run tests against live API server"""
    cmd = 'pytest test_grover_api_live.py -v'
    return run_command(cmd, "Running Live API Tests")


def run_unit_tests():
    """Run only unit tests"""
    cmd = 'pytest test_grover_pytest.py::TestHealthEndpoints test_grover_pytest.py::TestResponseValidation -v'
    return run_command(cmd, "Running Unit Tests")


def run_integration_tests():
    """Run integration tests (API endpoints)"""
    cmd = 'pytest test_grover_pytest.py::TestGroverSearch test_grover_pytest.py::TestGroverAnalysis test_grover_pytest.py::TestCircuitInfo -v'
    return run_command(cmd, "Running Integration Tests")


def run_error_tests():
    """Run error handling tests"""
    cmd = 'pytest test_grover_pytest.py::TestErrorHandling test_grover_pytest.py::TestEdgeCases -v'
    return run_command(cmd, "Running Error Handling Tests")


def run_performance_tests():
    """Run performance and concurrency tests"""
    cmd = 'pytest test_grover_pytest.py::TestPerformance test_grover_pytest.py::TestConcurrency -v'
    return run_command(cmd, "Running Performance Tests")


def run_coverage():
    """Run tests with coverage report"""
    commands = [
        "coverage erase",
        "coverage run -m pytest test_grover_pytest.py",
        "coverage report -m",
        "coverage html"
    ]
    
    for cmd in commands:
        if not run_command(cmd, f"Coverage: {cmd}"):
            return False
    
    print("\n📊 Coverage report generated in htmlcov/index.html")
    return True


def run_parallel_tests():
    """Run tests in parallel for faster execution"""
    try:
        subprocess.run(["pip", "install", "pytest-xdist"], check=True, capture_output=True)
        cmd = 'pytest test_grover_pytest.py -n auto -v'
        return run_command(cmd, "Running Parallel Tests")
    except subprocess.CalledProcessError:
        print("❌ Failed to install pytest-xdist for parallel testing")
        return False


def lint_code():
    """Run code linting"""
    try:
        subprocess.run(["pip", "install", "flake8", "black"], check=True, capture_output=True)
        
        commands = [
            "black --check *.py",
            "flake8 *.py --max-line-length=100 --ignore=E203,W503"
        ]
        
        for cmd in commands:
            if not run_command(cmd, f"Linting: {cmd}"):
                return False
        return True
    except subprocess.CalledProcessError:
        print("❌ Failed to install linting tools")
        return False


def run_specific_test(test_name):
    """Run a specific test by name"""
    cmd = f'pytest test_grover_pytest.py -k "{test_name}" -v'
    return run_command(cmd, f"Running Specific Test: {test_name}")


def check_api_health():
    """Check if API is running and healthy"""
    try:
        import requests # type: ignore
        import time
        
        print("\n🔍 Checking API health...")
        
        # Try to start the API in background (optional)
        # This would require uvicorn to be running separately
        
        try:
            response = requests.get("http://localhost:8087/health", timeout=5)
            if response.status_code == 200:
                print("✅ API is running and healthy")
                return True
            else:
                print(f"⚠️ API returned status code: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ API is not running. Start it with: uvicorn grover_api:app --reload --port 8087")
            return False
    except ImportError:
        print("⚠️ requests not available for health check")
        return False


def main():
    parser = argparse.ArgumentParser(description="Grover API Test Runner")
    parser.add_argument("--fast", action="store_true", help="Run only fast tests")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--live", action="store_true", help="Run tests against live API server")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument("--integration", action="store_true", help="Run integration tests only")
    parser.add_argument("--errors", action="store_true", help="Run error handling tests")
    parser.add_argument("--performance", action="store_true", help="Run performance tests")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage")
    parser.add_argument("--parallel", action="store_true", help="Run tests in parallel")
    parser.add_argument("--lint", action="store_true", help="Run code linting")
    parser.add_argument("--health", action="store_true", help="Check API health")
    parser.add_argument("--test", type=str, help="Run specific test by name")
    parser.add_argument("--ci", action="store_true", help="Run CI pipeline (fast tests + linting)")
    
    args = parser.parse_args()
    
    success = True
    
    # Check if pytest is available
    try:
        subprocess.run(["pytest", "--version"], check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ pytest not found. Install with: pip install pytest")
        sys.exit(1)
    
    if args.health:
        success &= check_api_health()
    
    if args.fast:
        success &= run_fast_tests()
    elif args.all:
        success &= run_all_tests()
    elif args.live:
        success &= run_live_api_tests()
    elif args.unit:
        success &= run_unit_tests()
    elif args.integration:
        success &= run_integration_tests()
    elif args.errors:
        success &= run_error_tests()
    elif args.performance:
        success &= run_performance_tests()
    elif args.coverage:
        success &= run_coverage()
    elif args.parallel:
        success &= run_parallel_tests()
    elif args.lint:
        success &= lint_code()
    elif args.test:
        success &= run_specific_test(args.test)
    elif args.ci:
        print("🔄 Running CI Pipeline")
        success &= lint_code()
        success &= run_fast_tests()
    else:
        # Default: run fast tests
        print("🏃‍♂️ No specific option selected, running fast tests by default")
        print("Use --help to see all available options")
        success &= run_fast_tests()
    
    if success:
        print("\n🎉 All selected tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main() 