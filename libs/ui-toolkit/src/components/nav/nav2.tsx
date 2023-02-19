import { NavLink } from 'react-router-dom';
import { create } from 'zustand';
import * as NavigationMenu from '@radix-ui/react-navigation-menu';
import type { ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Icon, ThemeSwitcher } from '@vegaprotocol/ui-toolkit';
import { NetworkSwitcher } from '@vegaprotocol/environment';
import classNames from 'classnames';
import { animated, useTransition, useSpring, config } from 'react-spring';

const BREAKPOINT = 760;
const useNav = create<{
  drawerOpen: boolean;
  value: string;
  update: (state: Partial<{ drawerOpen: boolean; value: string }>) => void;
}>((set) => ({
  drawerOpen: false,
  value: '',
  update: (state) => set(state),
}));

export const Navbar = ({ children }: { children: ReactNode }) => {
  return (
    <div className="px-4 border-b border-vega-light-200 dark:border-vega-dark-200">
      <div className="flex items-center gap-2">
        <div className="py-3 mr-4">THE ICON</div>
        {window.innerWidth > BREAKPOINT ? (
          <Menu>{children}</Menu>
        ) : (
          <Drawer>{children}</Drawer>
        )}
      </div>
    </div>
  );
};

const Menu = ({ children }: { children: ReactNode }) => {
  const { value, update } = useNav();
  return (
    <>
      <div className="mr-4">
        <NetworkSwitcher />
      </div>
      <NavigationMenu.Root
        value={value}
        onValueChange={(value) => update({ value })}
        className="relative self-end"
      >
        {children}
      </NavigationMenu.Root>
      <div className="flex items-center gap-2 ml-auto">
        <ThemeSwitcher />
      </div>
    </>
  );
};

const Drawer = ({ children }: { children: ReactNode }) => {
  const { drawerOpen, value, update } = useNav();
  const transition = useTransition(drawerOpen, {
    from: { opacity: 0, transform: 'translateX(100%)' },
    enter: { opacity: 1, transform: 'translateX(0%)' },
    leave: { opacity: 0, transform: 'translateX(100%)' },
    config: {
      ...config.default,
      duration: 200,
    },
  });

  return (
    <>
      <div className="ml-auto">
        <MenuButton open={false} onClick={() => update({ drawerOpen: true })} />
      </div>
      <Dialog.Root
        open={drawerOpen}
        onOpenChange={(open) => update({ drawerOpen: open })}
      >
        <Dialog.Portal forceMount={true}>
          {transition((styles, isOpen) => {
            return isOpen ? (
              <>
                <Dialog.Overlay
                  forceMount={true}
                  asChild={true}
                  className="fixed inset-0 bg-black/50"
                >
                  <animated.div style={{ opacity: styles.opacity }} />
                </Dialog.Overlay>
                <Dialog.Content
                  forceMount={true}
                  asChild={true}
                  className="absolute top-0 right-0 py-4 px-6 w-10/12 border-l border-vega-dark-200 h-screen bg-white dark:bg-black text-black dark:text-white"
                >
                  <animated.div style={{ transform: styles.transform }}>
                    <div className="absolute top-3 right-3">
                      <MenuButton
                        open={true}
                        onClick={() => update({ drawerOpen: false })}
                      />
                    </div>
                    <div className="pt-10">
                      <div className="pb-6 mb-6 border-b border-vega-dark-200">
                        <NetworkSwitcher />
                      </div>
                      <NavigationMenu.Root
                        value={value}
                        onValueChange={(value) => update({ value })}
                      >
                        {children}
                        <NavigationMenu.Viewport className="absolute w-full h-full top-0 left-0 bg-black" />
                      </NavigationMenu.Root>
                      <div className="pt-6 mt-6 border-t border-vega-dark-200">
                        <ThemeSwitcher />
                      </div>
                    </div>
                  </animated.div>
                </Dialog.Content>
              </>
            ) : null;
          })}
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export const NavigationList = ({ children }: { children: ReactNode }) => {
  return (
    <NavigationMenu.List className="flex flex-col md:flex-row gap-2">
      {children}
    </NavigationMenu.List>
  );
};

export const NavigationItem = ({ children }: { children: ReactNode }) => {
  return (
    <NavigationMenu.Item className="relative mb-4 md:mb-0 last:mb-0 md:mr-4 last:mr-0 whitespace-nowrap">
      {children}
    </NavigationMenu.Item>
  );
};

export const NavigationLink = ({
  children,
  path,
}: {
  children: ReactNode;
  path: string;
}) => {
  const update = useNav((store) => store.update);
  const borderClasses = classNames(
    'absolute h-[2px] w-full bottom-[-1px] left-0',
    'bg-black dark:bg-vega-yellow'
  );

  return (
    <NavigationMenu.Link
      asChild={true}
      onClick={() => update({ drawerOpen: false, value: '' })}
    >
      <NavLink to={path} className="inline-block md:pt-2 text-lg">
        {({ isActive }) => {
          const linkTextClasses = classNames('hover:text-white', {
            'text-white': isActive,
            'text-vega-dark-300': !isActive,
          });
          return (
            <span className="block relative pb-1 md:pb-2">
              <span className={linkTextClasses}>{children}</span>
              {isActive && <span className={borderClasses} />}
            </span>
          );
        }}
      </NavLink>
    </NavigationMenu.Link>
  );
};

export const NavigationTrigger = ({ children }: { children: ReactNode }) => {
  // eslint-disable-next-line
  const preventHover = (event: any) => {
    const e = event as Event;
    if (window.innerWidth < BREAKPOINT) e.preventDefault();
  };
  return (
    <NavigationMenu.Trigger
      onPointerMove={preventHover}
      onPointerLeave={preventHover}
      onPointerEnter={preventHover}
      className="w-full flex items-center justify-between text-vega-dark-300 hover:text-white text-lg md:py-2"
    >
      {children}
      <span className="md:rotate-90 md:ml-3">
        <Icon name="arrow-right" size={3} />
      </span>
    </NavigationMenu.Trigger>
  );
};

export const NavigationContent = ({
  children,
  backText,
}: {
  children: ReactNode;
  backText: string;
}) => {
  return (
    <NavigationMenu.Content>
      <NavigationContentWrapper backText={backText}>
        {children}
      </NavigationContentWrapper>
    </NavigationMenu.Content>
  );
};

const NavigationContentWrapper = ({
  backText,
  children,
}: {
  backText: string;
  children: ReactNode;
}) => {
  const drawerConfig = {
    from: { transform: 'translateX(100%)' },
    to: { transform: 'translateX(0%)' },
    config: {
      ...config,
      duration: 200,
    },
  };
  const menuConfig = {
    from: { opacity: 0, transform: 'translateY(40px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    config: {
      ...config,
      duration: 100,
    },
  };
  const styles = useSpring(
    window.innerWidth > BREAKPOINT ? menuConfig : drawerConfig
  );

  return (
    <animated.div
      style={styles}
      className="pt-20 md:py-2 px-4 z-30 md:absolute md:mt-3 md:border border-vega-dark-200 bg-black dark:md:bg-vega-dark-100 md:rounded-xl"
    >
      <div className="flex items-center md:hidden mb-6 text-vega-dark-300 hover:text-white">
        <Icon name="arrow-left" size={3} />
        <span className="ml-2">{backText}</span>
      </div>
      <ul className="md:min-w-[250px]">{children}</ul>
    </animated.div>
  );
};

const MenuButton = ({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) => (
  <button
    className={classNames(
      'flex flex-col justify-around gap-3 p-2 relative h-[34px]'
    )}
    onClick={onClick}
    data-testid="button-menu-drawer"
  >
    <div
      className={classNames('w-[26px] h-[2px] transition-all', {
        'translate-y-0 rotate-0 bg-white': !open,
        // 'bg-black': !drawerOpen && navbarTheme === 'yellow',
        'translate-y-[7.5px] rotate-45 bg-black dark:bg-white': open,
      })}
    />
    <div
      className={classNames('w-[26px] h-[2px] transition-all', {
        'translate-y-0 rotate-0 bg-white': !open,
        // 'bg-black': !drawerOpen && navbarTheme === 'yellow',
        '-translate-y-[7.5px] -rotate-45 bg-black dark:bg-white': open,
      })}
    />
  </button>
);
