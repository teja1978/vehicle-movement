import React, { useState, useEffect } from 'react';
import './Home.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash } from '@fortawesome/free-solid-svg-icons';

const Home = ({ scenarios, selectScenario, selectedScenario }) => {
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [editedVehicle, setEditedVehicle] = useState({});
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [vehiclePositions, setVehiclePositions] = useState({});
  const [simulationTime, setSimulationTime] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (selectedScenario !== null) {
      fetchVehicles(selectedScenario);
      setSimulationTime(null);
    }
  }, [selectedScenario]);

  useEffect(() => {
    let interval;
    if (isSimulationRunning) {
      interval = setInterval(() => {
        updateVehiclePositions();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulationRunning, vehiclePositions]);

  const fetchVehicles = async (scenarioId) => {
    const response = await fetch(`http://localhost:3001/vehicles/scenario/${scenarioId}`);
    const data = await response.json();
    setSelectedVehicles(data);
    initializeVehiclePositions(data);

    const scenario = scenarios.find(scenario => scenario.id === scenarioId);
    if (scenario) {
      const timeInSeconds = parseInt(scenario.time);
      setSimulationTime(timeInSeconds * 1000);
    }
  };

  const initializeVehiclePositions = (vehicles) => {
    const positions = {};
    vehicles.forEach(vehicle => {
      positions[vehicle.id] = { x: Math.max(0, Math.min(100, parseFloat(vehicle.positionX))), y: Math.max(0, Math.min(100, parseFloat(vehicle.positionY))), active: true };
    });
    setVehiclePositions(positions);
  };

  const updateVehiclePositions = () => {
    setVehiclePositions((prevPositions) => {
      const newPositions = { ...prevPositions };
      selectedVehicles.forEach(vehicle => {
        const { x, y, active } = newPositions[vehicle.id];
        if (!active) return;

        let newX = x;
        let newY = y;
        const speed = parseFloat(vehicle.speed);

        switch (vehicle.direction) {
          case 'Towards':
            newX += speed;
            break;
          case 'Backwards':
            newX -= speed;
            break;
          case 'Upwards':
            newY -= speed;
            break;
          case 'Downwards':
            newY += speed;
            break;
          default:
            break;
        }

        console.log(`Vehicle ${vehicle.id} - New Position: (${newX}, ${newY})`);

        if (newX < 0 || newY < 0 || newX > 100 || newY > 100) {
          newPositions[vehicle.id] = { x: Math.max(0, Math.min(100, newX)), y: Math.max(0, Math.min(100, newY)), active: false };
        } else {
          newPositions[vehicle.id] = { x: newX, y: newY, active: true };
        }
      });
      return newPositions;
    });
  };

  const handleEditClick = (vehicle) => {
    setEditingVehicleId(vehicle.id);
    setEditedVehicle(vehicle);
  };

  const handleSaveClick = async () => {
    if (editedVehicle.positionX < 0 || editedVehicle.positionX > 100 || editedVehicle.positionY < 0 || editedVehicle.positionY > 100) {
      setErrors({
        positionX: editedVehicle.positionX < 0 || editedVehicle.positionX > 100 ? 'Position X must be within 0-100' : '',
        positionY: editedVehicle.positionY < 0 || editedVehicle.positionY > 100 ? 'Position Y must be within 0-100' : '',
      });
      return;
    }

    setErrors({});

    await fetch(`http://localhost:3001/vehicles/${editingVehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editedVehicle),
    });
    fetchVehicles(selectedScenario);
    setEditingVehicleId(null);
  };

  const handleDeleteClick = async (vehicleId) => {
    await fetch(`http://localhost:3001/vehicles/${vehicleId}`, {
      method: 'DELETE',
    });
    fetchVehicles(selectedScenario);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedVehicle((prev) => ({ ...prev, [name]: value }));

    if (name === 'positionX' || name === 'positionY') {
      const parsedValue = parseFloat(value);
      setErrors((prev) => ({
        ...prev,
        [name]: parsedValue < 0 || parsedValue > 100 ? `${name === 'positionX' ? 'Position X' : 'Position Y'} must be within 0-100` : '',
      }));
    }
  };

  const handleAddSimulationClick = () => {
    if (simulationTime) {
      setIsSimulationRunning(true);
      console.log('Simulation started');

      setTimeout(() => {
        setIsSimulationRunning(false);
        console.log('Simulation stopped');
      }, simulationTime);
    } else {
      console.error('Simulation time is not set.');
    }
  };

  const handleStopSimulationClick = () => {
    setIsSimulationRunning(false);
    console.log('Simulation stopped');
  };

  return (
    <div className="home-container">
      <h2>Scenarios</h2>
      <div className="dropdown-container">
        <select onChange={(e) => selectScenario(parseInt(e.target.value))} value={selectedScenario || ''}>
          <option value="" disabled>Select a Scenario</option>
          {scenarios.map(scenario => (
            <option key={scenario.id} value={scenario.id}>{scenario.name}</option>
          ))}
        </select>
      </div>

      {selectedScenario && (
        <>
          <h2>Vehicles for Scenario {selectedScenario}</h2>
          <table>
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Vehicle Name</th>
                <th>Speed</th>
                <th>Position X</th>
                <th>Position Y</th>
                <th>Direction</th>
                <th>Edit</th>
                <th>Delete</th>
              </tr>
            </thead>
            <tbody>
              {selectedVehicles.map(vehicle => (
                <tr key={vehicle.id}>
                  {editingVehicleId === vehicle.id ? (
                    <>
                      <td>{vehicle.id}</td>
                      <td><input type="text" name="name" value={editedVehicle.name} onChange={handleChange} /></td>
                      <td><input type="text" name="speed" value={editedVehicle.speed} onChange={handleChange} /></td>
                      <td>
                        <input type="text" name="positionX" value={editedVehicle.positionX} onChange={handleChange} />
                        {errors.positionX && <div className="error">{errors.positionX}</div>}
                      </td>
                      <td>
                        <input type="text" name="positionY" value={editedVehicle.positionY} onChange={handleChange} />
                        {errors.positionY && <div className="error">{errors.positionY}</div>}
                      </td>
                      <td>
                        <select name="direction" value={editedVehicle.direction} onChange={handleChange}>
                          <option value="Towards">Towards</option>
                          <option value="Backwards">Backwards</option>
                          <option value="Upwards">Upwards</option>
                          <option value="Downwards">Downwards</option>
                        </select>
                      </td>
                      <td><button onClick={handleSaveClick}>Save</button></td>
                      <td><button onClick={() => setEditingVehicleId(null)}>Cancel</button></td>
                    </>
                  ) : (
                    <>
                      <td>{vehicle.id}</td>
                      <td>{vehicle.name}</td>
                      <td>{vehicle.speed}</td>
                      <td>{vehicle.positionX}</td>
                      <td>{vehicle.positionY}</td>
                      <td>{vehicle.direction}</td>
                      <td>
                        <button className="icon-button" onClick={() => handleEditClick(vehicle)}>
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                      </td>
                      <td>
                        <button className="icon-button" onClick={() => handleDeleteClick(vehicle.id)}>
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button-container">
            <button onClick={handleAddSimulationClick} disabled={isSimulationRunning}>Start Simulation</button>
            <button onClick={handleStopSimulationClick} disabled={!isSimulationRunning}>Stop Simulation</button>
          </div>
          <div className="simulation-grid">
            {selectedVehicles.map(vehicle => {
              const position = vehiclePositions[vehicle.id];
              return position && position.active ? (
                <div
                  key={vehicle.id}
                  className="vehicle"
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                >
                  {vehicle.name}
                </div>
              ) : null;
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
