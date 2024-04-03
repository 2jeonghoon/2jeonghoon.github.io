import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import HomeView from "./views/HomeView";

const App = () => {
    return (
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<HomeView />} />
        </Routes>
    </BrowserRouter>
    );
};

export default App;

                        
                        
                            
                                
출처: https://webstoryboy.co.kr/1935 [WEBSTORYBOY:티스토리]