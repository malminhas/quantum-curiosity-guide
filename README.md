# Quantum Computing: Grover's Algorithm Implementation 🔍⚡

A comprehensive implementation of Grover's quantum search algorithm featuring a FastAPI web service, interactive Jupyter notebook, and extensive testing suite. This project demonstrates practical quantum computing with quadratic speedup for unstructured search problems.

## 🌟 Overview

Grover's algorithm solves the fundamental problem of searching through unsorted databases with **quadratic speedup** compared to classical methods. While classical computers need O(N) operations to search N items, Grover's algorithm achieves the same result in O(√N) operations using quantum superposition and interference.

### Key Features
- 🚀 **FastAPI Web Service**: RESTful API for quantum search operations
- 📓 **Interactive Jupyter Notebook**: Educational content with step-by-step examples
- 🧪 **Comprehensive Testing**: Unit, integration, and performance tests
- 🎯 **1-3 Qubit Support**: Search spaces from 2 to 8 quantum states
- ⚡ **Quantum Simulation**: Fast execution on classical simulators
- 📊 **Performance Analysis**: Real-time metrics and complexity comparisons

## 🎯 Grover's Algorithm: The Quantum Advantage

### The Problem
Imagine searching for a specific item in a massive, unsorted database:
- **Database queries**: Finding records in millions of entries
- **Cryptography**: Testing password combinations
- **Optimization**: Locating optimal solutions
- **Pattern matching**: Finding specific data patterns

### Classical vs Quantum Approach

| **Approach** | **Time Complexity** | **Database Size: 1M Items** | **Operations Needed** |
|-------------|-------------------|---------------------------|----------------------|
| **Classical** | O(N) | 1,000,000 items | ~500,000 on average |
| **Quantum (Grover)** | O(√N) | 1,000,000 items | ~1,000 operations |
| **Speedup** | | | **500x faster!** |

### Real-World Performance Gains

| Database Size | Classical Operations | Grover Operations | Speedup Factor |
|---------------|---------------------|-------------------|----------------|
| 100 items     | ~50                 | ~8                | **6x faster**      |
| 10,000 items  | ~5,000              | ~79               | **63x faster**     |
| 1 million     | ~500,000            | ~1,000            | **500x faster**    |
| 1 billion     | ~500 million        | ~31,623           | **15,811x faster** |

## 🛠️ Architecture & Implementation

### Core Components

```
quantum/
├── grover_api.py              # FastAPI web service
├── grover.ipynb               # Educational Jupyter notebook
├── test_grover_pytest.py      # Comprehensive test suite
├── test_grover_api.py         # API integration tests
├── test_grover_api_live.py    # Live API testing
├── run_tests.py               # Test runner with multiple modes
├── requirements.txt           # Python dependencies
├── pyproject.toml            # Project configuration
└── local.env                 # Environment variables
```

### Tech Stack
- **Quantum Computing**: [Qiskit](https://qiskit.org/) - IBM's quantum development framework
- **Web Framework**: [FastAPI](https://fastapi.tiangolo.com/) - Modern, fast web API framework
- **Simulation**: [Qiskit Aer](https://qiskit.org/ecosystem/aer/) - High-performance quantum simulators
- **Testing**: [pytest](https://pytest.org/) - Comprehensive testing framework
- **Documentation**: Interactive API docs with OpenAPI/Swagger

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd quantum
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the API server**
   ```bash
   # Default port 8087 with hot reload
   uvicorn grover_api:app --reload --port 8087
   
   # Or run directly with Python (uses default port 8087)
   python grover_api.py
   
   # Custom port with hot reload
   uvicorn grover_api:app --reload --port 9000
   ```

4. **Access the interactive documentation**
   - API Docs: http://localhost:8087/docs
   - Alternative Docs: http://localhost:8087/redoc

### Basic Usage

#### Via Web API
```bash
# Search for quantum state "101" in 8-state space
curl -X POST "http://localhost:8087/grover/search" \
     -H "Content-Type: application/json" \
     -d '{
       "target_state": "101",
       "shots": 1000,
       "backend": "simulator"
     }'
```

#### Via Python (Direct API)
```python
from grover_api import create_grover_circuit
from qiskit_aer import AerSimulator

# Create quantum circuit for searching "11"
circuit, iterations = create_grover_circuit("11")

# Execute on simulator
simulator = AerSimulator()
job = simulator.run(circuit, shots=1000)
result = job.result()
print(result.get_counts())
```

#### Via Jupyter Notebook
```bash
jupyter notebook grover.ipynb
```

## 🧮 How Grover's Algorithm Works

### 1. The Oracle Function
The **oracle** is a quantum function that can recognize target states and "mark" them with a phase flip:

```python
def build_grover_oracle(target_state: str) -> QuantumCircuit:
    """
    Creates oracle that flips phase of target state
    - Input: target_state (e.g., "101")  
    - Output: Quantum circuit that marks the target
    """
```

**Key Insight**: The oracle doesn't reveal the answer directly. It invisibly "tags" the correct state so the algorithm can amplify its probability.

### 2. Amplitude Amplification
Grover's algorithm uses **quantum interference** to:
- **Amplify** the probability of measuring the correct answer
- **Suppress** probabilities of wrong answers
- **Iterate** this process exactly the right number of times

### 3. Optimal Iterations
The number of iterations needed is precisely calculated:
```python
optimal_iterations = math.floor(math.pi * math.sqrt(N) / 4)
```
Where N is the size of the search space (2^num_qubits).

### 4. Measurement
After optimal iterations, measuring the quantum system yields the target state with high probability (typically >95%).

## 📡 API Reference

### Core Endpoints

#### `GET /`
**Root Endpoint** - Redirects to interactive API documentation.
- **Response**: 307 redirect to `/docs`
- **Purpose**: Convenient access to Swagger UI documentation

#### `POST /grover/search`
**Execute Grover's Quantum Search** - Run the complete Grover algorithm.

**Request Body:**
* `target_state`: Binary string (1-3 qubits): "0", "1", "00"-"11", "000"-"111"
* `shots`: Number of measurements (100-10,000)
* `backend`: Quantum backend.  Can be "simulator" or real Quantum hardware.
```json
{
  "target_state": "101",
  "shots": 1000,
  "backend": "simulator"
}
```

**Response:**
```json
{
  "target_state": "101",
  "num_qubits": 3,
  "optimal_iterations": 2,
  "shots": 1000,
  "success_rate": 96.2,
  "measurements": {
    "000": 12, "001": 15, "010": 8, "011": 9,
    "100": 13, "101": 962, "110": 11, "111": 10
  },
  "circuit_depth": 15,
  "execution_time_ms": 45.67,
  "timestamp": "2024-01-20T10:30:00"
}
```

#### `GET /grover/analyze/{target_state}`
**Analyze Target State Performance** - Get theoretical performance predictions.

**Parameters:**
- `target_state`: Binary string (1-3 qubits), e.g., "101"

**Response:**
```json
{
  "target_state": "101",
  "analysis": {
    "num_qubits": 3,
    "search_space_size": 8,
    "optimal_iterations": 2,
    "theoretical_success_rate": 96.1,
    "classical_average_tries": 4.0,
    "quantum_operations": 2,
    "speedup_factor": 2.0
  },
  "performance_comparison": {
    "classical_worst_case": 8,
    "classical_average_case": 4.0,
    "quantum_grover": 2,
    "advantage": "2.0x faster on average"
  }
}
```

#### `GET /grover/circuit/{target_state}`
**Get Quantum Circuit Information** - Retrieve detailed circuit analysis.

**Parameters:**
- `target_state`: Binary string (1-3 qubits), e.g., "11"

**Response:**
```json
{
  "target_state": "11",
  "circuit_info": {
    "num_qubits": 2,
    "num_classical_bits": 2,
    "circuit_depth": 10,
    "total_gates": 16,
    "optimal_iterations": 1,
    "transpiled_depth": 8,
    "transpiled_gates": 14
  },
  "circuit_diagram": "ASCII representation of the quantum circuit",
  "gate_summary": {
    "h": 6,
    "x": 4, 
    "cz": 2,
    "measure": 2,
    "barrier": 1
  }
}
```

#### `GET /health`
**API Health Check** - Check API status and basic capabilities.

**Response:**
```json
{
  "status": "healthy",
  "message": "Grover's Algorithm API is running",
  "version": "1.0.0",
  "max_qubits": 3,
  "available_backends": ["simulator"],
  "description": "Quantum search using Grover's algorithm",
  "docs_url": "/docs",
  "redoc_url": "/redoc"
}
```

#### `GET /info`
**Comprehensive API Information** - Detailed algorithm information and examples.

**Response includes:**
- Algorithm complexity and benefits (O(√N) vs O(N))
- Supported qubit configurations (1-3 qubits)
- Backend status and availability
- Usage examples for different scenarios (1, 2, 3 qubits)
- Technical implementation details (oracle, diffusion, gates)
- Parameter constraints (shots: 100-10,000)

### Error Responses

All endpoints return structured error responses for invalid inputs:

**400 Bad Request** - Invalid parameters:
```json
{
  "detail": "Target state must be 1-3 qubits"
}
```

**422 Unprocessable Entity** - Validation errors:
```json
{
  "detail": [
    {
      "loc": ["body", "target_state"],
      "msg": "Target state must be a binary string",
      "type": "value_error"
    }
  ]
}
```

**500 Internal Server Error** - Quantum execution failures:
```json
{
  "detail": "Quantum execution failed: [error description]"
}
```

## 🧪 Testing

### Test Categories

The project includes extensive testing across multiple dimensions:

- **Unit Tests**: Core algorithm logic
- **Integration Tests**: API endpoint functionality  
- **Performance Tests**: Timing and scalability
- **Error Handling**: Edge cases and validation
- **Concurrency Tests**: Multi-request scenarios

### Running Tests

```bash
# Quick test suite (fast tests only)
python run_tests.py --fast

# All tests including performance
python run_tests.py --all

# Test coverage report
python run_tests.py --coverage

# Specific test categories
python run_tests.py --unit          # Unit tests only
python run_tests.py --integration   # API integration tests
python run_tests.py --performance   # Performance benchmarks
python run_tests.py --errors        # Error handling tests

# Parallel execution (faster)
python run_tests.py --parallel

# Live API testing (requires running server)
python run_tests.py --live

# Check API health
python run_tests.py --health
```

### Test Statistics
- **546 test lines** in main test suite
- **Parametric testing** for all qubit combinations (1-3 qubits)
- **Performance benchmarks** with timing validation
- **Error case coverage** for all invalid inputs
- **Concurrent request testing** for scalability

## 📊 Performance Characteristics

### Quantum Advantage Demonstration

| **Search Space** | **Classical Average** | **Grover Iterations** | **Success Rate** | **Speedup** |
|------------------|----------------------|----------------------|------------------|-------------|
| 2 states (1 qubit) | 1.0 tries | 1 iteration | ~100% | 1x |
| 4 states (2 qubits) | 2.0 tries | 1 iteration | ~100% | 2x |
| 8 states (3 qubits) | 4.0 tries | 2 iterations | ~96% | 2x |

### Algorithm Complexity
- **Time Complexity**: O(√N) quantum operations
- **Space Complexity**: O(log N) qubits needed
- **Success Probability**: cos²((2k+1)π/(4√N)) where k is iterations
- **Optimal Iterations**: π√N/4 for maximum success rate

### Execution Performance
- **Single Search**: ~50ms average execution time
- **Concurrent Requests**: Supports multiple parallel searches
- **Circuit Depth**: Scales with O(√N) iterations
- **Gate Count**: Linear in number of qubits and iterations

## 🔬 Educational Resources

### Jupyter Notebook Content
The `grover.ipynb` notebook provides comprehensive educational material:

1. **Problem Introduction**: Why quantum search matters
2. **Algorithm Intuition**: How quantum superposition enables speedup
3. **Step-by-Step Implementation**: Building the quantum circuit
4. **Visual Results**: Measurement probability distributions
5. **Performance Analysis**: Classical vs quantum comparisons
6. **Mathematical Background**: The theory behind the algorithm

### Key Learning Concepts
- **Quantum Superposition**: How qubits exist in multiple states simultaneously
- **Quantum Interference**: Using wave properties to amplify correct answers
- **Oracle Design**: Marking target states without revealing them
- **Amplitude Amplification**: The core mechanism of Grover's algorithm
- **Measurement Statistics**: Interpreting probabilistic quantum results

## 🛡️ Error Handling & Validation

The API includes comprehensive validation:

- **Input Validation**: Binary string format, length constraints
- **Parameter Bounds**: Shot counts (100-10,000), qubit limits (1-3)
- **Quantum State Validation**: Proper quantum state representation
- **Backend Availability**: Simulator accessibility checks
- **Circuit Construction**: Robust oracle and circuit building
- **Execution Monitoring**: Timeout and error recovery

## 🔧 Configuration

### Environment Variables
```bash
# local.env
IBM_QUANTUM_API_KEY=your_api_key_here
DEBUG=false
PORT=8087           # Optional: Override default port
LOG_LEVEL=INFO      # Optional: Set logging level (DEBUG, INFO, WARNING, ERROR)
```

### Port Configuration
The API supports flexible port configuration:

```bash
# Method 1: Using uvicorn command line (recommended for development)
uvicorn grover_api:app --reload --port 8087  # Default port
uvicorn grover_api:app --reload --port 9000  # Custom port

# Method 2: Using environment variable
export PORT=8090
python grover_api.py  # Will use port 8090

# Method 3: Inline environment variable
PORT=8090 python grover_api.py

# Method 4: Default behavior (no configuration)
python grover_api.py  # Uses default port 8087
```

### Logging Configuration
The API includes comprehensive logging with configurable levels:

```bash
# Set logging level via environment variable
export LOG_LEVEL=DEBUG  # DEBUG, INFO, WARNING, ERROR
python grover_api.py

# Inline logging configuration
LOG_LEVEL=DEBUG python grover_api.py

# Combined port and logging configuration
PORT=8087 LOG_LEVEL=DEBUG python grover_api.py
```

**Logging Features:**
- **Centralized Configuration**: `setup_logging()` function manages all logging setup
- **File Logging**: Automatic log file creation (`grover_api.log`)
- **Console Logging**: Real-time output to stdout
- **Structured Logs**: Timestamp, level, and contextual information
- **Request Tracing**: Complete API request/response logging
- **Error Tracking**: Detailed error logs with stack traces
- **Performance Metrics**: Execution timing for quantum operations
- **Environment Control**: Configurable via `LOG_LEVEL` environment variable
- **Initialization Logging**: Self-documenting logging setup with debug information

### Project Configuration
The `pyproject.toml` includes:
- **Dependencies**: Quantum and web framework packages
- **Test Configuration**: pytest settings and markers
- **Code Quality**: Black formatting and linting rules
- **Build Settings**: Package metadata and build requirements

## 🚀 Deployment

### Local Development
```bash
# Development server with auto-reload (default port 8087)
uvicorn grover_api:app --reload --host 0.0.0.0 --port 8087

# Custom port with hot reload
uvicorn grover_api:app --reload --host 0.0.0.0 --port 9000

# Using environment variable for port
PORT=8090 uvicorn grover_api:app --reload --host 0.0.0.0 --port 8090
```

### Production Deployment
```bash
# Production server (default port 8087)
uvicorn grover_api:app --host 0.0.0.0 --port 8087 --workers 4

# Custom port for production
uvicorn grover_api:app --host 0.0.0.0 --port 8080 --workers 4
```

### Docker Deployment
```dockerfile
FROM python:3.9-slim
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8087
CMD ["uvicorn", "grover_api:app", "--host", "0.0.0.0", "--port", "8087"]
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature-name`
3. **Write tests** for new functionality
4. **Run the test suite**: `python run_tests.py --all`
5. **Submit a pull request**

### Development Guidelines
- Follow PEP 8 style guidelines
- Add comprehensive tests for new features
- Update documentation for API changes
- Maintain backward compatibility where possible

## 📚 References & Further Reading

### Quantum Computing Resources
- [Qiskit Textbook](https://qiskit.org/textbook/) - Comprehensive quantum computing education
- [IBM Quantum Experience](https://quantum-computing.ibm.com/) - Access to real quantum hardware
- [Grover's Original Paper](https://arxiv.org/abs/quant-ph/9605043) - "A fast quantum mechanical algorithm for database search"

### Algorithm Analysis
- **Time Complexity**: Proves O(√N) vs classical O(N)
- **Optimality**: Grover's algorithm is provably optimal for unstructured search
- **Applications**: Cryptography, optimization, machine learning acceleration

### Implementation Details
- **Oracle Construction**: Phase kickback and controlled operations
- **Amplitude Amplification**: Generalization beyond basic search
- **Error Correction**: Handling quantum decoherence and gate errors

## 🛠️ Development with Lovable

This project is also available on [Lovable](https://lovable.dev/projects/4ab0f257-262c-43e5-b615-b6e0498fb549), a platform for building and editing applications with AI assistance.

### How can I edit this code?

There are several ways of editing your application:

#### Use Lovable

Simply visit the [Lovable Project](https://lovable.dev/projects/4ab0f257-262c-43e5-b615-b6e0498fb549) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

#### Use your preferred IDE

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - install with [nvm](https://github.com/nvm-sh/nvm).

Follow these steps:

```bash
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

#### Edit a file directly in GitHub

1. Navigate to the desired file(s).
2. Click the "Edit" button (pencil icon) at the top right of the file view.
3. Make your changes and commit the changes.

#### Use GitHub Codespaces

1. Navigate to the main page of your repository.
2. Click on the "Code" button (green button) near the top right.
3. Select the "Codespaces" tab.
4. Click on "New codespace" to launch a new Codespace environment.
5. Edit files directly within the Codespace and commit and push your changes once you're done.

### What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### How can I deploy this project?

Simply open Lovable and click on Share → Publish.

### Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips/custom-domain)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors & Acknowledgments

- **Quantum Computing Lab** - Initial implementation
- **IBM Qiskit Team** - Quantum computing framework
- **FastAPI Contributors** - Web framework development

---

**Ready to explore quantum search?** Start with the Jupyter notebook for learning, then try the API for practical applications! 🚀⚡
