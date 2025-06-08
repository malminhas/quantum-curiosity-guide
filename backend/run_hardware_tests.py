#!/usr/bin/env python3
"""
Hardware Test Runner

Simple script to run only the hardware-related tests for the Grover API.
Useful for testing IBM Quantum integration endpoints.
"""

import subprocess
import sys
from pathlib import Path


def run_hardware_tests():
    """Run hardware tests using pytest with hardware marker"""
    print("🔧 Running Hardware Tests for Grover API")
    print("=" * 50)
    
    try:
        # Run pytest with hardware marker
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "-m", "hardware",
            "-v",
            "--tb=short"
        ], cwd=Path(__file__).parent)
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1


def run_all_tests():
    """Run all tests"""
    print("🧪 Running All Tests for Grover API")
    print("=" * 50)
    
    try:
        # Run all pytest tests
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            "test_grover_pytest.py",
            "-v",
            "--tb=short"
        ], cwd=Path(__file__).parent)
        
        return result.returncode
        
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"❌ Error running tests: {e}")
        return 1


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        exit_code = run_all_tests()
    else:
        exit_code = run_hardware_tests()
    
    if exit_code == 0:
        print("\n✅ All tests passed!")
    else:
        print(f"\n❌ Tests failed with exit code: {exit_code}")
    
    sys.exit(exit_code) 