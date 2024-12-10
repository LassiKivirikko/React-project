import './Settings.css';
import React, { useState } from 'react';

const Settings = () => {
    const [darkMode, setDarkMode] = useState('dark');

    const toggleDarkMode = () => {
        setDarkMode('dark');
        document.body.style.backgroundColor = 'black';
        document.body.style.color = 'white';
    }
    const toggleLightMode = () => {
        setDarkMode('light');
        document.body.style.backgroundColor = 'white';
        document.body.style.color = 'black';
    }

    return (
        <div>
            <h1>Settings</h1>
            <button onClick={toggleDarkMode}>DarkMode</button>
            <button onClick={toggleLightMode}>LightMode</button>
        </div>
    )
}
export default Settings;