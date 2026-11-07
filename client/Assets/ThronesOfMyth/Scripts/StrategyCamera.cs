using UnityEngine;

namespace ThronesOfMyth
{
    public sealed class StrategyCamera : MonoBehaviour
    {
        public bool blockInput;
        public System.Func<bool> inputBlocked;
        private Camera view;
        private Vector3 focus = new Vector3(20, 0, 20);
        private Vector3 previousMouse;
        private void Awake()
        {
            view = GetComponent<Camera>();
            view.orthographic = true;
            view.orthographicSize = 24;
            view.farClipPlane = 250;
            view.backgroundColor = new Color(0.68f, 0.76f, 0.77f);
            view.clearFlags = CameraClearFlags.SolidColor;
        }
        public void Focus(float x, float z) { focus = new Vector3(x, 0, z); Apply(); }
        private void Update()
        {
            if (!blockInput && !(inputBlocked?.Invoke() ?? false))
            {
                var keyboard = new Vector3(Input.GetAxisRaw("Horizontal"), 0, Input.GetAxisRaw("Vertical"));
                focus += keyboard * (view.orthographicSize * 0.8f) * Time.unscaledDeltaTime;
                view.orthographicSize = Mathf.Clamp(view.orthographicSize - Input.mouseScrollDelta.y * 2, 10, 65);
                if (Input.GetMouseButtonDown(2)) previousMouse = Input.mousePosition;
                if (Input.GetMouseButton(2))
                {
                    var delta = Input.mousePosition - previousMouse;
                    focus += new Vector3(-delta.x, 0, -delta.y) * view.orthographicSize / Mathf.Max(1, Screen.height) * 2;
                    previousMouse = Input.mousePosition;
                }
            }
            focus.x = Mathf.Clamp(focus.x, 0, 80); focus.z = Mathf.Clamp(focus.z, 0, 80); Apply();
        }
        private void Apply()
        {
            transform.position = focus + new Vector3(0, 42, -30);
            transform.LookAt(focus);
        }
    }
}
