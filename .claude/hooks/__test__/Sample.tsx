import   React   from "react";
import { useState } from "react";

export default function Sample() {
    const [x,y] = useState(0)
  return <div>{x}</div>
}
