import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import PropTypes from 'prop-types';
import './Home.css';

const ItemTypes = {
    TAG: 'tag',
};
// iso apu https://blog.logrocket.com/drag-and-drop-react-dnd/
// https://www.geeksforgeeks.org/implement-drag-and-drop-using-react-component/
// https://react-dnd.github.io/react-dnd/docs/tutorial
const Tag = ({ tag, onDoubleClick }) => {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: ItemTypes.TAG,
        item: { id: tag.id, name: tag.name },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    return (
        <div ref={drag} className="tag" style={{ opacity: isDragging ? 0.5 : 1 }} onDoubleClick={() => onDoubleClick(tag.id)}>
            {tag.name}
        </div>
    );
};
// propTypes on Reactin oma tapa varmistaa,
// että komponentti saa oikeanlaisia propseja.
// Esimerkiksi tässä tapauksessa Tag-komponentti odottaa propseinaan tag-objektin,
// joka sisältää id- ja name-kentät. Jos komponentti saa jotain muuta, se tulostaa virheen konsoliin.
// AI:n avulla sain tietää propTypestä ja sen käytöstä.
Tag.propTypes = {
    tag: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
    }).isRequired,
    onDoubleClick: PropTypes.func,
};

const Task = ({ task, onDropTag, onDeleteTag, onDeleteTask }) => {
    // käytetään localStoragessa olevaa tilaa, jotta painikkeen tila säilyy sivun päivityksissä
    const [buttonClicked, setButtonClicked] = useState(() => {
        const savedState = localStorage.getItem(`buttonClicked-${task.id}`);
        return savedState ? JSON.parse(savedState) : false;
    });

    useEffect(() => {
        localStorage.setItem(`buttonClicked-${task.id}`, JSON.stringify(buttonClicked));
    }, [buttonClicked, task.id]);

    const [{ isDropped }, drop] = useDrop(() => ({
        accept: ItemTypes.TAG,
        drop: (item) => onDropTag(task.id, item),
        collect: (monitor) => ({
            isDropped: monitor.isOver(),
        }),
    }));

    return (
        <div ref={drop} style={{ border: '2px solid lightgray', padding: '5px', width: '30%' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => onDeleteTask(task.id)}>Delete</button>
            </div>
            <p>Name: {task.name}</p>
            <p>Tags:</p>
            <ul>
                {task.tags.map((tag) => (
                    <li key={`${task.id}-${tag.id}`}>
                        <Tag tag={tag} onDoubleClick={(tagId) => onDeleteTag(task.id, tagId)}/>
                    </li>
                ))}
            </ul>
            <p>Additional Data: {task.additional_data}</p>
            <button onClick={() => setButtonClicked(!buttonClicked)}>{buttonClicked ? 'Stop' : 'Active'}</button>
        </div>
    );
};

Task.propTypes = {
    task: PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        tags: PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.number.isRequired,
                name: PropTypes.string.isRequired,
            })
        ).isRequired,
        additional_data: PropTypes.string,
    }).isRequired,
    onDropTag: PropTypes.func.isRequired,
    onDeleteTag: PropTypes.func.isRequired,
    onDeleteTask: PropTypes.func.isRequired,
};

const Home = () => {
    const [tasks, setTasks] = useState([]);
    const [tags, setTags] = useState([]);
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskAdditionalData, setNewTaskAdditionalData] = useState('');
    const [newTagName, setNewTagName] = useState('');
    const [TagAdded, setTagAdded] = useState(false);
    const [TaskAdded, setTaskAdded] = useState(false);
    const [taskDeleted, setTaskDeleted] = useState(false);

    useEffect(() => {
        const fetchTags = async () => {
            const response = await axios.get('http://localhost:3010/tags');
            const allTags = response.data;
            const tagsData = {};

            // antaa kaikille tageille id:tä vastaavat nimet
            allTags.forEach(tag => {
                tagsData[tag.id] = tag.name;
            });

            return Object.entries(tagsData).map(([id, name]) => ({ id: Number(id), name }));
        };
        // Tässä fetchTasks-funktio hakee kaikki tehtävät
        // ja muokkaa niitä siten, että tehtävän tags-kenttä sisältää tag-objekteja
        // AI auttoi ternary operaattorin käytössä, koska ilman sitä tuli
        // undefined erroria, kun yritin hakea tehtävän tagit, jotka eivät olleet olemassa.
        const fetchTasks = async (tagsData) => {
            const response = await axios.get('http://localhost:3010/tasks');
            console.log("Raw backend response:", response.data);
            return response.data.map(task => ({
                ...task,
                tags: task.tags
                    ? task.tags
                        .split(',')
                        .filter(tagId => tagsData.some(tag => tag.id === Number(tagId))) // Filteröidään pois mahdolliset tagit, joita ei löydy tagsDatasta
                        .map(tagId => tagsData.find(tag => tag.id === Number(tagId)))
                    : [],
            }));
        };
        const fetchData = async () => {
            try {
                const tagsData = await fetchTags();
                const tasksData = await fetchTasks(tagsData);
                setTasks(tasksData);
                setTags(tagsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [TaskAdded, taskDeleted, TagAdded]);

    // lisää tagit tehtäviin backendiin
    const updateTaskTags = async (taskId, tags) => {
        try {
            await axios.put(`http://localhost:3010/tasks/${taskId}`, { tags: tags.map(tag => tag.id).join(',') });
        } catch (error) {
            console.error('Error updating task tags:', error);
        }
    };
    const deleteTasksTags = async (taskId, tagId) => {
        try {
            // etsii tehtävän, jolla on poistettava tagi
            // jos tehtävää ei löydy, ei tehdä mitään
            const task = tasks.find(task => task.id === taskId);
            if (!task) return;

            // päivitetään tehtävän tagit siten, että poistettava tagi jätetään pois
            const updatedTags = task.tags.filter(tag => tag.id !== tagId);

            // päivitetään tehtävän tagit backendiin
            await axios.put(`http://localhost:3010/tasks/${taskId}`, { tags: updatedTags.map(tag => tag.id).join(',') });
        } catch (error) {
            console.error('Error deleting task tag:', error);
        }
    };

    const deleteTask = async (taskId) => {
        try {
            await axios.delete(`http://localhost:3010/tasks/${taskId}`);
            setTaskDeleted(prev => !prev);
        } catch (error) {
            console.error('Error deleting task:', error);
        }
    };

    const addNewTask = async (task) => {
        try {
            await axios.post('http://localhost:3010/tasks', task);
            setTaskAdded(prev => !prev);
        } catch (error) {
            console.error('Error adding new task:', error);
        }
    };

    const addNewTag = async () => {
        try {
            const tag = { name: newTagName };
            await axios.post('http://localhost:3010/tags', tag);
            setTagAdded(prev => !prev);
        } catch (error) {
            console.error('Error adding new tag:', error);
        }
    }

    const deleteTag = async (tagId) => {
        try {
            await axios.delete(`http://localhost:3010/tags/${tagId}`);
            setTaskDeleted(prev => !prev);
        } catch (error) {
            console.error('Error deleting tag:', error);
        }
    }
    // katsotaan onko tagi jo tehtävässä ja onko tehtävällä jo 3 tagia
    // Jos ei ole, niin lisätään tagi tehtävään
    const handleDropTag = (taskId, tag) => {
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    const tagExists = task.tags.some(test => test.id === tag.id);
                    if (!tagExists && task.tags.length < 3) {
                        const updatedTags = [...task.tags, tag];
                        updateTaskTags(taskId, updatedTags);
                        return { ...task, tags: updatedTags }; // Ensure all task fields are preserved
                    }
                }
                return task;
            })
        );
    };

    const handleDeleteTag = (taskId, tagId) => {
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    const updatedTags = task.tags.filter(tag => tag.id !== tagId);
                    deleteTasksTags(taskId, tagId);
                    return { ...task, tags: updatedTags };
                }
                return task;
            })
        );
    }
    const handleAddTask = () => {
        addNewTask({ name: newTaskName, additional_data: newTaskAdditionalData, tags: [] });
        setNewTaskName('');
        setNewTaskAdditionalData('');
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className='home-container'>
                <h1>Tasks</h1>
                <div className="add-task">
                    <input type="text" placeholder="Task name" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} />
                    <input type="text" placeholder="Additional data" value={newTaskAdditionalData}onChange={(e) => setNewTaskAdditionalData(e.target.value)} />
                    <button onClick={handleAddTask}>Add Task</button>
                </div>
                <div className="add-tag">
                    <input type="text" placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                    <button onClick={addNewTag}>Add Tag</button>
                </div>
                <ul>
                    {tasks.map(task => (
                        <Task key={task.id} task={task} onDropTag={handleDropTag} onDeleteTag={handleDeleteTag} onDeleteTask={deleteTask} />
                    ))}
                </ul>
                <div className="tags-container">
                    {tags.map(tag => (
                        <Tag key={tag.id} tag={tag} onDoubleClick={() => {}} />
                    ))}
                </div>
                <div className='tag-delete'>
                    <h2>Delete tags</h2>
                    <ul>
                        {tags.map(tag => (
                            <li key={tag.id}>{tag.name} <button onClick={() => deleteTag(tag.id)}>Delete</button></li>
                        ))}
                    </ul>
                </div>
            </div>
        </DndProvider>
    );
};

export default Home;